# Agent Snow

Agent Snow is a local-first intelligence layer built for Snow OS. It is designed to help you build, review, debug, plan, and guide work inside a privacy-aware workspace while still supporting optional cloud reasoning through Gemini.

Instead of behaving like a generic chatbot, Agent Snow is structured as an adaptive companion with role switching, focus modes, workspace awareness, and a polished Snow OS interface.

## Highlights

- Local-first runtime with optional Gemini-backed responses
- Adaptive roles: Developer, Student, Analyst, Mentor, and Executor
- Adaptive focus modes: Explore, Build, Ship, Learn, and Debug
- Workspace-aware guidance with hotspot and file-type signals
- Privacy controls for workspace access, memory, encryption, and cloud use
- Local encrypted session vault using browser crypto
- Structured reply system with mission analysis, risk checks, checkpoints, and success criteria
- Prompt upgrades, alternative-path planning, and explainability traces
- Snow OS-inspired interface with animated boot flow, guided loading states, and themed UI

## Why This Exists

Agent Snow is meant to be more than an assistant window. It acts as a build-focused agent for Snow OS: a place where product thinking, implementation support, debugging help, and guided execution come together in one system.

## Project Structure

- `src/server.js` runs the local server, permission handling, workspace scanning, and response routing
- `src/openai.js` contains the Gemini integration and structured response merge logic
- `src/intelligence.js` powers local reasoning, role inference, focus selection, and heuristic planning
- `src/workspace.js` handles workspace summaries and relevant file extraction
- `public/index.html` defines the main Snow OS-style interface
- `public/styles.css` contains the visual system and responsive styling
- `public/app.js` powers the frontend runtime, chat flow, local vault, and UI orchestration

## Running Locally

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Environment

Copy `.env.example` to `.env` and update the values you want to use.

```powershell
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
AGENT_SNOW_MODEL=gemini-1.5-flash
AGENT_SNOW_REASONING_EFFORT=medium
```

If `GEMINI_API_KEY` is missing, Agent Snow still works in local mode.

## Docker

Build and start:

```powershell
docker compose up --build -d
```

View logs:

```powershell
docker compose logs -f
```

Stop the app:

```powershell
docker compose down
```

## Privacy Model

- Workspace access is permission-based
- Cloud access is permission-based
- Session memory is stored locally in the browser
- Encrypted storage can be enabled for local vault data
- Local fallback remains available when Gemini is disabled, unconfigured, or unavailable

The browser vault protects stored session data inside the app, but it should not be treated as a substitute for full disk encryption or a dedicated secrets manager.

## Scripts

- `npm start` starts the local server
- `npm run dev` starts the app with `nodemon`
- `npm run check` runs syntax validation for the backend and frontend runtime files

## Notes

- Default cloud model: `gemini-1.5-flash`
- Default reasoning effort: `medium`
- Agent Snow falls back to the local planner automatically when cloud access is unavailable
