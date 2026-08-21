# Ishara

Arabic Sign Language recognition and translation platform.

Ishara captures hand landmarks from a browser camera, stores sign samples in PostgreSQL, and compares recorded gesture sequences with stored examples to produce Arabic text. The project is designed as an extensible foundation for Arabic sign language datasets and accessibility tools.

## Current Features

- Browser-based hand tracking with MediaPipe Tasks Vision.
- 3D landmark sequence capture from a webcam.
- Arabic sign dictionary with categories, difficulty levels, and dialect variants.
- Gesture-to-text translation using Dynamic Time Warping (DTW) and K-Nearest Neighbors (KNN).
- JWT-based registration, login, refresh, logout, and current-user endpoints.
- Protected teacher and admin endpoints for recording sign samples.
- PostgreSQL persistence through Drizzle ORM.
- Production mode that serves the built client from the API server.

## Architecture

```text
React + Vite client
        |
        v
Express + TypeScript API
        |
        +--> Authentication and authorization
        +--> Dictionary and sign recording routes
        +--> DTW/KNN translation service
        |
        v
PostgreSQL via Drizzle ORM
```

The recognition pipeline is:

```text
Camera -> MediaPipe landmarks -> gesture sequence -> DTW similarity -> KNN result -> Arabic text
```

Each frame contains one or more hands. Each landmark contains `x`, `y`, and an optional `z` coordinate. A stored sign variant also includes its dialect, media references, and landmark sequences.

## Requirements

- Node.js 20 or newer.
- npm.
- Docker Desktop, or another PostgreSQL 16 instance.
- A browser with camera access for recording and translation.

## Quick Start

### 1. Install dependencies

From the repository root:

```bash
npm install --prefix client
npm install --prefix server
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

The included Compose file starts PostgreSQL with these local development values:

| Setting  | Value       |
| -------- | ----------- |
| Host     | `localhost` |
| Port     | `5432`      |
| Database | `ishara`    |
| User     | `ishara`    |
| Password | `ishara`    |

### 3. Configure the server

Create `server/.env`:

```env
DATABASE_URL=postgres://ishara:ishara@localhost:5432/ishara
JWT_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-another-long-random-secret
JWT_EXPIRES_IN=1h
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Do not commit real secrets. `DATABASE_URL`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` are required by the server.

### 4. Apply database migrations

```bash
npm run db:migrate --prefix server
```

### 5. Start the development servers

Run these commands in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open the client at <http://localhost:5173>. The API health check is available at <http://localhost:3000/api/health>.

## Environment Variables

| Variable               | Required | Default                                | Description                                                 |
| ---------------------- | -------- | -------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | None                                   | PostgreSQL connection URL.                                  |
| `JWT_SECRET`           | Yes      | None                                   | Secret used to sign access tokens.                          |
| `REFRESH_TOKEN_SECRET` | Yes      | None                                   | Secret used to sign refresh tokens.                         |
| `JWT_EXPIRES_IN`       | No       | `1h`                                   | Access-token lifetime.                                      |
| `NODE_ENV`             | No       | Development behavior                   | Enables production static serving when set to `production`. |
| `PORT`                 | No       | `3000`                                 | API server port.                                            |
| `CORS_ORIGIN`          | No       | `http://localhost:5173` in development | Allowed client origin.                                      |

For a separately hosted API, create `client/.env` with:

```env
VITE_API_URL=http://localhost:3000
```

When `VITE_API_URL` is omitted, the client uses relative `/api` requests, which is suitable when the API serves the production client.

## Available Scripts

Run root scripts from the repository root:

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev:client` | Start the Vite development server.                |
| `npm run dev:server` | Start the API with automatic reload.              |
| `npm run build`      | Install dependencies and build both applications. |
| `npm start`          | Start the compiled production API.                |

Server scripts:

| Command                               | Purpose                                   |
| ------------------------------------- | ----------------------------------------- |
| `npm run build --prefix server`       | Compile the API with TypeScript.          |
| `npm run db:generate --prefix server` | Generate a migration from schema changes. |
| `npm run db:migrate --prefix server`  | Apply pending migrations.                 |
| `npm run db:studio --prefix server`   | Open Drizzle Studio.                      |

Client scripts:

| Command                           | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `npm run build --prefix client`   | Type-check and build the Vite client. |
| `npm run lint --prefix client`    | Run Oxlint.                           |
| `npm run preview --prefix client` | Preview the production client build.  |

## API Overview

All application routes are prefixed with `/api`.

| Method | Endpoint                  | Auth          | Purpose                                    |
| ------ | ------------------------- | ------------- | ------------------------------------------ |
| `GET`  | `/health`                 | Public        | Check API availability.                    |
| `POST` | `/auth/register`          | Public        | Create a user account.                     |
| `POST` | `/auth/login`             | Public        | Log in and receive authentication cookies. |
| `POST` | `/auth/refresh-token`     | Public        | Refresh an access token.                   |
| `POST` | `/auth/logout`            | User          | Clear the session.                         |
| `GET`  | `/auth/me`                | User          | Get the current user.                      |
| `GET`  | `/dictionary`             | Public        | Retrieve dictionary entries.               |
| `POST` | `/translate/sign-to-text` | Public        | Translate a landmark sequence.             |
| `POST` | `/admin/signs/record`     | Teacher/Admin | Store a sign variant.                      |
| `POST` | `/translate/clear-cache`  | Admin         | Clear translation cache.                   |

The translation request body has this shape:

```json
{
  "dialect": "standard",
  "landmarksJson": [[[{ "x": 0.5, "y": 0.5, "z": 0 }]]]
}
```

The real request must contain a non-empty sequence of frames. Each frame contains one or more hands, and each hand contains landmark points.

## Project Structure

```text
client/src/                 React pages and camera features
server/src/controllers/     Request handlers
server/src/routes/          API route definitions
server/src/services/        Translation and similarity logic
server/src/db/              Drizzle schema and migrations
server/src/middleware/      Authentication and validation
server/src/validation/      Zod request schemas
docker-compose.yml          Local PostgreSQL service
```

## Recognition Approach

The translation service currently uses an explainable nearest-neighbor approach:

- DTW compares gesture sequences while tolerating differences in signing speed.
- KNN selects the closest stored sign variants for the requested dialect.
- A cache reduces repeated database and similarity calculations.

This is a baseline, not a trained neural model. Future work may include larger datasets, continuous translation, feedback and review workflows, and sequence models such as LSTMs or Transformers.

## Development Notes

- Camera features require permission to access the browser webcam.
- Keep API and client origins aligned through `CORS_ORIGIN` and `VITE_API_URL` when running them separately.
- Generate and apply a migration whenever `server/src/db/schema.ts` changes.
- Use strong, unique secrets outside local development.
- The production server expects the client build at `client/dist`.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Author

**mnoNoor**

Repository: <https://github.com/mnoNoor/ishara>
