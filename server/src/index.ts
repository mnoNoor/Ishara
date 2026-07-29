import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import adminRoutes from "./routes/adminRouter";
import translateRoutes from "./routes/translateRouter";
import dictionaryRoutes from "./routes/dictionaryRoutes";

const app = express();
const PORT = process.env.PORT || 3000;
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

app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
}
console.log(
  "Translate routes loaded:",
  translateRoutes.stack.map((r) => r.route?.path),
);
console.log(
  "Admin routes loaded:",
  adminRoutes.stack.map((r) => r.route?.path),
);

app.use("/api/admin", adminRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/dictionary", dictionaryRoutes);
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
});
