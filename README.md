# Foundry — a mini AI website builder

Describe a site in chat, get a working React site rendered live, ask for changes, export a zip.
A small clone of the Lovable/v0-style workflow: **prompt → generated code → live preview → iterate → export.**

```
┌──────────────┐   POST /api/generate    ┌──────────────────┐   tool call    ┌───────────┐
│  React client │ ───────────────────────▶│  Express server   │ ─────────────▶│ Claude API │
│  (chat + Sandpack preview)              │  (project store)  │◀───────────── │ write_project tool
└──────────────┘  ◀── files + summary ────└──────────────────┘   files JSON  └───────────┘
```

## How it works

1. **Chat → prompt.** The client sends `{ projectId, prompt }` to `POST /api/generate`.
2. **Server → Claude.** `server/src/anthropic.js` calls the Claude API with a system prompt that
   constrains the model to a small, self-contained React site (Sandpack's `react` template: an
   `/App.js` entry, optional `/components/*.js`, one `/styles.css`). Output is forced through a
   `write_project` tool (not free text), so the response is always structured JSON:
   `{ summary, files }`. On an edit, the current files are included in the prompt so the model
   returns the full, updated file set rather than a diff.
3. **Server → store.** Files, snapshot versions, and chat history are kept per project in memory
   (`server/src/projectStore.js` — swap this for Redis/Postgres for anything beyond a demo).
4. **Version history & Undo/Redo.** Every generation creates a snapshot version (`v1`, `v2`, ...).
   Users can undo (`⌘Z`), redo (`⌘⇧Z`), or jump to any previous command using the topbar version controls.
5. **Client → preview.** `client/src/components/PreviewPanel.jsx` feeds the returned files straight
   into [Sandpack](https://sandpack.codesandbox.io/), which bundles and runs the React code
   **in the browser** — no server-side build step, no deploy, instant live preview. A Code tab
   shows the same files in a file tree + editor.
6. **Export.** `GET /api/projects/:id/export` zips the current files for download.

## Project layout

```
server/            Express API
  src/index.js       app + listen
  src/routes.js       /api/generate, /api/projects, /api/projects/:id/rollback, /export
  src/generator.js    Gemini & Claude generation, system prompt, image resolution
  src/projectStore.js in-memory project store (files, versions, chat history)

client/            Vite + React frontend
  src/App.jsx                 wires chat + preview + version controls together
  src/components/ChatPanel.jsx     message list + version notices + input
  src/components/PreviewPanel.jsx  Sandpack live preview / code view + file sync
  src/api.js                  fetch wrapper for generate, rollback, redo, restore
  src/styles.css               design tokens, layout & version bar styles
```

## Run it

Needs Node 18.17+ and either a [Google Gemini API key](https://aistudio.google.com/app/apikey) or an [Anthropic API key](https://console.anthropic.com/settings/keys).

```bash
# 1. Backend
cd server
cp .env.example .env        # paste your GEMINI_API_KEY or ANTHROPIC_API_KEY into .env
npm install
npm run dev                 # http://localhost:8787

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 — proxies /api to :8787
```

Open http://localhost:5173, describe a site, watch it render, ask for a change, hit **Export .zip**
when you're happy.

## Deploy to Vercel

Deploy the API and frontend as **two Vercel projects** from the same repository. This keeps the
Gemini/Anthropic key on the server and out of the browser bundle.

1. Push this repository to GitHub. Do not commit `server/.env`.
2. In Vercel, import the repository and create an API project with **Root Directory** set to
   `server`. Vercel detects `src/index.js` as the Express entry point.
3. In the API project's **Environment Variables**, add `GEMINI_API_KEY` and optionally `MODEL`.
   Deploy it and copy its URL, for example `https://foundry-api.vercel.app`.
4. Import the repository again to create the frontend project with **Root Directory** set to
   `client`. Add `VITE_API_URL` with the API URL from step 3 (no trailing slash), then deploy.
5. Open the frontend deployment, generate a site, make one edit, and test **Export .zip**.

The API currently stores projects in memory, so a Vercel serverless cold start can clear project
history. That is acceptable for a short recruitment demo, but use a database such as Postgres,
Redis, or Vercel KV before treating it as persistent production storage.

Already verified in this build: both `npm install`s succeed, `client` builds cleanly with `vite build`,
and the server boots and answers `/api/health`, `/api/generate`, and `/api/projects` correctly
(including a clean error — not a crash — when `ANTHROPIC_API_KEY` is missing). Wire in your own key
to test real generation.

## Known limits / what a "mini" builder skips

- **In-memory store** — projects vanish on server restart. Fine for a demo; swap `projectStore.js`
  for a real DB before anyone relies on it.
- **No streaming** — `/api/generate` waits for the full Claude response before replying. Chat feels
  like Lovable's "thinking…" beat rather than a token-by-token stream. Anthropic's SDK supports
  streaming tool calls; wiring that up is the highest-leverage next step for perceived speed.
- **No auth / multi-user separation** — anyone hitting the API can list/edit any project ID.
- **Single-page sites only** — the system prompt deliberately keeps generations to one `/App.js` +
  a few components, no routing. Multi-page generation is a matter of loosening that constraint and
  giving the model a router-capable template.
- **react + react-dom only** — no npm install at generation time, so the model can't reach for a
  component library. Trade-off for reliability (nothing to fail to resolve) over generation variety.
- **Export is static source, not a deploy** — the zip is a Vite/CRA-shaped React project the user
  still has to build and host themselves. Wiring `export` to something like Vercel's deploy API is
  the natural next step if "click to go live" matters.

## Extending it

- **Streaming**: switch `client.messages.create` to `client.messages.stream`, forward tool-call
  deltas over SSE/WebSocket, and update `PreviewPanel` incrementally.
- **Persistence**: replace the `Map` in `projectStore.js` with a real store; the rest of the app
  only talks to that module's exported functions, so nothing else needs to change.
- **Multi-page sites**: change the Sandpack template to `vite-react` or add a router, and update the
  system prompt's file-layout rules accordingly.
- **Real image generation**: swap the `placehold.co` instruction in the system prompt for a call to
  an image model, and have the server inline the resulting URLs into the files it returns.
# aisite
