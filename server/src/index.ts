import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { createServer } from "node:http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import authRoutes from "./routes/authRouter";
import adminRoutes from "./routes/adminRouter";
import translateRoutes from "./routes/translateRouter";
import dictionaryRoutes from "./routes/dictionaryRoutes";
import { LiveTranslateSession } from "./services/liveTranslateService";
import type { Frame } from "./db/db.types";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8080;
const __dirname = path.resolve();

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'wasm-unsafe-eval'",
          "https://cdn.jsdelivr.net",
        ],
        "connect-src": [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://storage.googleapis.com",
        ],
        "worker-src": ["'self'", "blob:"],
        "img-src": ["'self'", "data:", "blob:"],
      },
    },
  }),
);

app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    }),
  );
}

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/dictionary", dictionaryRoutes);
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

const io = new Server(server, {
  path: "/ws/translate",
  cors: { origin: process.env.CORS_ORIGIN || "http://localhost:5173" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  let session: LiveTranslateSession | null = null;

  socket.on("translate:start", async ({ dialect }: { dialect: string }) => {
    try {
      console.log(`Starting translation session for dialect: ${dialect}`);
      session = await LiveTranslateSession.create(dialect);
      socket.emit("translate:ready");
      console.log("Translation session ready for client:", socket.id);
    } catch (err) {
      console.error("فشل بناء فهرس اللهجة:", err);
      socket.emit("translate:error", {
        message: "تعذّر تهيئة الجلسة. تأكد من وجود بيانات اللهجة.",
      });
    }
  });

  socket.on("translate:frame", (frame: Frame) => {
    if (!session) {
      socket.emit("translate:error", {
        message: "أرسل translate:start أولاً",
      });
      return;
    }
    try {
      const events = session.pushFrame(frame, Date.now());
      for (const event of events) {
        socket.emit("translate:event", event);
      }
    } catch (err) {
      console.error("Error processing frame:", err);
      socket.emit("translate:error", {
        message: "حدث خطأ أثناء معالجة الفريم",
      });
    }
  });

  socket.on("translate:reset", () => {
    console.log("Resetting session for client:", socket.id);
    session?.reset();
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    session?.reset();
    session = null;
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

server
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    console.error("Server failed to start:", err);
  });
