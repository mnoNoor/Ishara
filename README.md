# Ishara

<p align="center">
  <b>Arabic Sign Language Recognition & Translation Platform</b>
</p>

<p align="center">
A full-stack platform for capturing, storing, and translating Arabic sign language gestures using browser-based hand tracking and gesture recognition algorithms.

---

## 🌍 Overview

- Storing structured gesture samples.
- Translating hand movements into Arabic text.
- Supporting future research and machine learning approaches.
- Gesture-to-text translation.
- Admin tools for adding new samples.
- Confidence-based translation results.
- PostgreSQL-powered data storage.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available commands](#available-commands)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Recognition pipeline](#recognition-pipeline)
- [Roadmap](#roadmap)
- [License](#license)

## Features

- Browser-based hand tracking with MediaPipe Tasks Vision.
- 3D hand landmark capture from a webcam.
- Sign recording for authenticated admins and teachers.
- Sign-to-text translation using stored gesture samples.
- Dictionary browsing with category, difficulty, and dialect-aware data.
- JWT-based authentication with refresh tokens and role-based access control.
- PostgreSQL persistence through Drizzle ORM.
- Request validation with Zod and HTTP security middleware with Helmet.

---

## Architecture

```text
React + Vite client
        |
        v
Express + TypeScript API
        |
        +--> Authentication and authorization
        +--> Dictionary and dataset routes
        +--> Translation service
        |
        v
PostgreSQL via Drizzle ORM
```

In development, the client runs on `http://localhost:5173` and the API runs on `http://localhost:8080`. In production, the server can serve the built client from `client/dist`.

## 🧠 How It Works

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop (for the local PostgreSQL database)
- A modern browser with webcam access

## Getting started

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d
```

The database container uses these local defaults:

```text
database: ishara
user: ishara
password: ishara
host: localhost
port: 5432
```

### 2. Install dependencies

```bash
npm install --prefix client
npm install --prefix server
```

### 3. Configure the server

Create `server/.env` using the variables in the section below.

### 4. Apply database migrations

```bash
npm run db:migrate --prefix server
```

### 5. Start the development servers

Use two terminals from the repository root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open `http://localhost:5173` in a browser and allow camera access when recording or translating signs.
Ishara converts hand movements into numerical landmark sequences.

## Environment variables

The API reads environment variables from `server/.env`:

| Variable               | Required | Example                                            | Purpose                              |
| ---------------------- | -------- | -------------------------------------------------- | ------------------------------------ |
| `DATABASE_URL`         | Yes      | `postgresql://ishara:ishara@localhost:5432/ishara` | PostgreSQL connection string         |
| `JWT_SECRET`           | Yes      | `replace-with-an-access-secret`                    | Signs access tokens                  |
| `REFRESH_TOKEN_SECRET` | Yes      | `replace-with-a-refresh-secret`                    | Signs refresh tokens                 |
| `JWT_EXPIRES_IN`       | No       | `1h`                                               | Access-token lifetime                |
| `PORT`                 | No       | `8080`                                             | API port                             |
| `NODE_ENV`             | No       | `development`                                      | Enables development CORS behavior    |
| `CORS_ORIGIN`          | No       | `http://localhost:5173`                            | Allowed client origin in development |

Example local configuration:

```dotenv
DATABASE_URL=postgresql://ishara:ishara@localhost:5432/ishara
JWT_SECRET=change-this-access-secret
REFRESH_TOKEN_SECRET=change-this-refresh-secret
JWT_EXPIRES_IN=1h
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

Do not commit `server/.env` or reuse development secrets in production.

## Available commands

Run these from the repository root unless noted otherwise:

| Command                               | Description                                      |
| ------------------------------------- | ------------------------------------------------ |
| `npm run dev:client`                  | Start the Vite development server                |
| `npm run dev:server`                  | Start the API with `tsx` watch mode              |
| `npm run build`                       | Install dependencies and build client and server |
| `npm run start`                       | Start the compiled API                           |
| `npm run lint --prefix client`        | Lint the client                                  |
| `npm run db:generate --prefix server` | Generate a Drizzle migration                     |
| `npm run db:migrate --prefix server`  | Apply pending migrations                         |
| `npm run db:studio --prefix server`   | Open Drizzle Studio                              |

Each hand is represented using:

## API overview

All endpoints are prefixed with `/api`.

| Area                    | Routes                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Health                  | `GET /api/health`                                                                                                              |
| Authentication          | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh-token`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Dictionary              | `GET /api/dictionary`                                                                                                          |
| Translation             | `POST /api/translate/sign-to-text`                                                                                             |
| Admin and teacher tools | `POST /api/admin/signs/record`                                                                                                 |
| Admin maintenance       | `POST /api/translate/clear-cache`                                                                                              |

Protected routes require the authentication flow's token or cookie, and recording is limited to users with the `admin` or `teacher` role. Request bodies for translation and recording are validated with Zod schemas on the server.

## Project structure

```text
client/
  src/components/       Shared UI and camera/translation components
  src/pages/             Home, dictionary, authentication, and static pages
  src/layout/            Application layout
server/
  src/controllers/      HTTP request handlers
  src/db/                Drizzle schema and migrations
  src/routes/            API route definitions
  src/services/          Translation and similarity logic
  src/middleware/        Authentication and request validation
  src/validation/        Zod request schemas
```

```
## Recognition pipeline

1. MediaPipe detects a hand in the camera stream.
2. The client extracts 3D landmarks for each frame.
3. The resulting sequence is sent to the translation API.
4. The translation service compares it with stored samples using Dynamic Time Warping (DTW).
5. Nearest samples are used for K-Nearest Neighbors (KNN) classification.
6. The API returns the predicted Arabic text and confidence information.

Each hand contains 21 landmarks with `x`, `y`, and `z` coordinates, or 63 coordinate values per frame.
21 landmarks × 3 coordinates (x, y, z)
## Roadmap

The current baseline focuses on webcam capture, dataset storage, authentication, dictionary access, and DTW/KNN translation. Planned improvements include:

- Continuous, real-time translation across sign sequences.
- Dataset review and quality-verification workflows.
- Translation feedback and correction tools.
- Larger and more diverse Arabic sign-language datasets.
- Evaluation against neural approaches such as LSTM and Transformer models.
- Mobile clients and research-oriented experiments.

## License

Ishara is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
= 63 values per hand
## Author

Created by [mnoNoor](https://github.com/mnoNoor).
```

The translation pipeline:

```
Camera
  ↓
MediaPipe Hand Tracking
  ↓
3D Landmark Extraction
  ↓
Gesture Sequence
  ↓
DTW Similarity Matching
  ↓
KNN Classification
  ↓
Arabic Text Output
```

---

## 🤖 Recognition Approach

The current version uses a lightweight and explainable approach:

### Dynamic Time Warping (DTW)

Used to compare gesture sequences while handling differences in movement speed between users.

### K-Nearest Neighbors (KNN)

Used to classify gestures based on the closest stored examples.

This approach allows Ishara to expand its dataset without requiring model retraining after every new sample.

Future versions may explore deep learning models such as LSTM and Transformers when larger datasets become available.

---

## 🏗️ Architecture

```
React + Vite Client

        │

Express + TypeScript API

        │

Translation Service

        │

DTW + KNN Engine

        │

PostgreSQL Database
```

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- MediaPipe Tasks Vision

### Backend

- Node.js
- Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- Zod
- Helmet

### Development

- Docker
- npm

---

## 🗄️ Data Model

Ishara stores:

### Signs

General information about each sign:

- Arabic text
- Category
- Difficulty
- Internal identifier

### Sign Variants

Gesture samples for different variations:

- Dialect
- Landmark sequences
- Media references
- Sample count

---

## 📊 Dataset Growth

The project is currently focused on creating a reliable foundation before large-scale expansion.

Future dataset growth will include:

- More Arabic signs.
- More users and contributors.
- Quality verification systems.
- User feedback collection.
- Improved filtering against incorrect samples.

---

## 🚀 Roadmap

### Current

✅ Webcam hand tracking
✅ Gesture recording
✅ PostgreSQL storage
✅ DTW + KNN translation engine

### Next

- Real-time continuous translation.
- Improved user experience.
- Authentication and protected admin tools.
- Translation feedback system.
- Dataset review workflow.

### Future

- Larger Arabic sign language dataset.
- LSTM / Transformer-based recognition.
- Mobile applications.
- Research-oriented experiments.

---

## 🔬 Research Potential

Ishara can serve as a foundation for research in:

- Arabic sign language recognition.
- Human-computer interaction.
- Accessibility technologies.
- Gesture recognition algorithms.
- Machine learning approaches for sign translation.

The current system provides a transparent baseline that can later be compared with neural network-based solutions.

---

## ⚙️ Running Locally

Requirements:

- Node.js
- npm
- Docker

Start PostgreSQL:

```bash
docker-compose up -d
```

Install dependencies:

```bash
npm install --prefix client
npm install --prefix server
```

Run development servers:

```bash
npm run dev:client
npm run dev:server
```

---

## 📄 License

This project is licensed under the Apache License 2.0.

---

## 👤 Author

**mnoNoor**

Building technology for accessibility and Arabic sign language understanding.
