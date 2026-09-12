# Debug Dungeon

Debug Dungeon is a gamified engineering-learning application. Players complete backend-backed missions, receive server-authoritative correctness feedback, earn XP, and receive deterministic learning recommendations. Admins can generate, validate, and publish missions through the protected AI pipeline.

## Architecture

```text
React
  |
Express
  |
Services
  |
Prisma
  |
PostgreSQL
```

Mission generation uses two AI stages behind one backend pipeline:

```text
Mission Generator
  |
Structured AI Output
  |
Deterministic Validation
  |
AI Semantic Validation
  |
Persistence
```

AI #1 generates mission content. AI #2 validates semantic quality. AI does not assign database IDs or mission numbers. Learning profiles and recommendations are deterministic backend calculations.

## Projects

- `DEBUG_DUNGEON_BACKEND`: Express, TypeScript, Prisma, PostgreSQL, JWT authentication, and the AI provider integration.
- `DEBUG_DUNGEON_FRONTEND`: Vite, React, TypeScript, and TailwindCSS.

## Local Setup

Prerequisites:

- Node.js 20+
- PostgreSQL
- A database named `debug_dungeon`
- OpenAI credentials only when exercising real mission generation

Install dependencies in both project directories:

```bash
cd DEBUG_DUNGEON_BACKEND && npm install
cd ../DEBUG_DUNGEON_FRONTEND && npm install
```

Copy the environment templates:

```bash
cp DEBUG_DUNGEON_BACKEND/.env.example DEBUG_DUNGEON_BACKEND/.env
cp DEBUG_DUNGEON_FRONTEND/.env.example DEBUG_DUNGEON_FRONTEND/.env
```

Use a long random `JWT_SECRET`. The backend `.env` is ignored by Git and must never be committed.

## Backend Environment

Required or supported variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: signing secret; production requires at least 32 characters.
- `PORT`: HTTP port, default `8000`.
- `FRONTEND_ORIGIN`: allowed browser origin. Production requires this value; local development accepts the configured origin and standard localhost Vite ports.
- `OPENAI_API_KEY`: backend-only provider credential.
- `OPENAI_MODEL`: structured-output model name.
- `OPENAI_BASE_URL`: optional provider base URL, default `https://api.openai.com/v1`.
- `OPENAI_TIMEOUT_MS`: provider timeout in milliseconds, default `30000`.
- `NODE_ENV`: use `production` for deployed backend processes.
- `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`: development-only seed admin credentials. The seed refuses to run in production.

## Frontend Environment

- `VITE_API_URL`: backend base URL, for example `http://localhost:8000` locally or `https://api.example.com` in production. Production builds do not fall back to a localhost URL.

Frontend variables are public build-time values. Never put secrets in `VITE_*` variables.

## Database and Prisma

Create or select the PostgreSQL database, set `DATABASE_URL`, then apply migrations:

```bash
cd DEBUG_DUNGEON_BACKEND
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

For development only, the seed creates the baseline mission and can create an admin from `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`:

```bash
npm run seed
```

The seed is disabled when `NODE_ENV=production` and does not overwrite existing mission rows.

## Running Locally

Start the backend:

```bash
cd DEBUG_DUNGEON_BACKEND
npm run dev
```

The backend listens on `http://localhost:8000` by default. Health checks are available at `GET /health` and `GET /`.

Start the frontend in another terminal:

```bash
cd DEBUG_DUNGEON_FRONTEND
npm run dev
```

## API Overview

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- `GET /health`
- `GET /users/me/learning-profile`
- `GET /users/me/recommendations`
- `GET /missions/:missionId`
- `POST /missions/:missionId/start`
- `POST /missions/:missionId/restart`
- `POST /missions/:missionId/attempts/:attemptId/questions/:questionId`
- `POST /missions/:missionId/attempts/:attemptId/complete`
- Admin-only generation, validation, and publication endpoints under `/missions/generate`, `/missions/validate`, and `/missions/generate-and-publish`.

Correctness is determined server-side. Player-facing mission responses never expose `Option.isCorrect`, password hashes, or unrelated user data. Answer correctness and explanations are returned only by the authenticated answer-submission endpoint.

## Security and Production Notes

- CORS is allowlisted using `FRONTEND_ORIGIN`; wildcard production CORS is not used.
- Authentication uses one-hour JWTs signed with `JWT_SECRET`.
- Registration/login are limited to 30 requests per IP per 15 minutes; AI generation/validation endpoints are limited to 60 requests per IP per minute. These are lightweight in-memory limits. For multi-instance deployments, put a shared gateway or distributed limiter in front of the service.
- Request JSON is limited to 1 MB and malformed JSON returns a client-safe 400 response.
- AI calls are backend-only, timeout-bounded, use structured output validation, and map provider failures to 502/503/504 responses.
- AI-generated IDs and mission numbers are discarded; persistence assigns trusted database values.
- The global error handler logs server-side errors but returns generic production-safe messages.
- The current limiter is process-local and resets on restart; it is suitable as a baseline, not a substitute for a distributed edge control.

## Verification

Frontend:

```bash
cd DEBUG_DUNGEON_FRONTEND
npm run build
```

Backend:

```bash
cd DEBUG_DUNGEON_BACKEND
npm run build
npx prisma validate
npx prisma migrate status
npm run test:answers
npm run test:completion
npm run test:active-attempts
npm run test:progress
npm run test:xp
npm run test:learning-profile
npm run test:generator
npm run test:authorization
npm run test:validator
npm run test:pipeline
npm run test:recommendations
npm run test:audit
```

No provider-specific deployment configuration is included. The projects are prepared for a normal Node/Vite deployment: run migrations separately, inject environment variables through the host, start the compiled backend with `npm start`, and serve the frontend build from a static host or compatible web server.
