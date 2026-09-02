# Ishara (إشارة)

**Ishara** is an open platform for translating **Arabic Sign Language** into text. It tracks 3D hand landmarks from a webcam, stores community-contributed samples, and matches new signs against that library.

The project is in active early development. The current recognizer covers a small set of Arabic letters and is intended as a research and data-collection foundation, not a finished production translator.

## Features

- **3D hand tracking** — MediaPipe Vision extracts 21 landmarks per hand (63 values with depth), supporting one- or two-handed signs.
- **Live translation** — a streaming WebSocket pipeline recognizes signs continuously as you sign, using hold detection to segment individual words in real time.
- **Dialect-aware design** — the data model and matching pipeline are built around per-dialect variants. Development is currently focused on a single dialect (Syrian), with support for additional dialects planned for later.
- **DTW-based matching** — sequences are compared with Dynamic Time Warping instead of a trained classifier, so a new sign can be matched from just a few recorded samples. The live pipeline pairs this with hold-based segmentation; a KNN-vote variant also exists for the one-shot HTTP endpoint (currently disabled, see below).
- **Community recording** — authenticated recorders contribute new landmark sequences so the dataset can grow over time.
- **Browsable dictionary** — words, variants, and sample counts live in PostgreSQL and are exposed through the web app.

## How it works

```mermaid
flowchart LR
  A[Webcam] --> B[MediaPipe Hand Landmarker]
  B --> C[Track & normalize frames]
  C --> D[WebSocket session]
  D --> E[Hold detection]
  E --> F[Beam match vs. trie / DTW fallback]
  F --> G[Arabic text + confidence]
```

This README stays at a product level. Full algorithmic and architectural detail — normalization formulas, hold detection, the beam-matching trie, the DTW fallback, database schema, and file-level responsibilities — lives in [`docs/PipelineProcess.md`](docs/PipelineProcess.md).

### Live translation (WebSocket)

This is currently the only active translation mode. The user starts the camera, and the client streams normalized hand landmarks to the server over a WebSocket session. The server detects moments of stillness ("holds") to segment individual signs and matches them against a hold-indexed trie as they happen, falling back to a sliding-window DTW match for signs without a clear hold. The session emits `partial`, `final`, or `idle` events as the user signs, instead of waiting for a single request/response round trip.

> A one-shot HTTP endpoint (`POST /api/translate/sign-to-text`, matching with DTW + KNN over recorded samples) also exists on the server, but is currently disabled on the client while the live-translation flow is developed further. Its algorithm is documented in [`docs/PipelineProcess.md`](docs/PipelineProcess.md) for reference.

### How samples enter the library

An authenticated **sign recorder** captures a clip the same way translation does, and labels it with Arabic text (a `word` id is derived automatically by transliteration). Dialect, category, and difficulty are currently sent with fixed defaults — there's no picker for them yet, though the schema already supports per-dialect variants. The sample is saved via `POST /api/admin/signs/record`. Each sample is stored as a landmark sequence linked to a word and a dialect variant; translation never touches raw video, only these trajectories. Adding a sample invalidates that dialect's cache so the next translation picks it up.

## Roadmap

- **Sentence-level support** — extending the data model beyond individual words to full sentences.
- **Hybrid recognition** — LSTM/Transformer models for data-rich words, with DTW + KNN retained for low-resource and newly added signs.
- **Native app** — a dedicated mobile/desktop client for recording and translating outside the browser.
- **Broader coverage** — additional dialects, more gesture variants of the same word, and normalization for signer fatigue.

## Research and community

Ishara is meant to support **research** on Arabic Sign Language: few-shot recognition, dialect variation, hybrid DTW/neural pipelines, and related HCI topics. The dataset and code are structured so experiments can sit on top of the same collection and evaluation loop.

We intend to **collaborate with deaf associations** to collect authentic samples, review glosses, and expand coverage beyond the current letter set. Community contributions through the recorder remain welcome alongside that partnership.

If you are a researcher, educator, or organization working with Arabic Sign Language, [open an issue](https://github.com/mnoNoor/ishara/issues) or use the in-app contact page.

## Tech stack

| Layer     | Stack                                             |
| --------- | ------------------------------------------------- |
| Client    | React, Vite, Tailwind CSS, MediaPipe Tasks Vision |
| Server    | Node.js, Express, TypeScript                      |
| Database  | PostgreSQL, Drizzle ORM                           |
| Real-time | WebSocket                                         |
| Auth      | JWT (access + refresh cookies)                    |

See [`docs/ProjectStructure.md`](docs/ProjectStructure.md) for the full file layout.

## Getting started

**Requirements:** Node.js, Docker (for PostgreSQL), and a camera for translation/recording.

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Server
cd server
cp .env.example .env   # edit secrets if needed
npm install
npm run db:migrate
npm run dev            # http://localhost:8080

# 3. Client (another terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

By default the client talks to `http://localhost:8080/api`. Override with `VITE_API_URL` if you change the API origin.

Production build from the repo root:

```bash
npm run build
npm start
```

## License

[GNU AGPL-3.0-or-later](LICENSE)
