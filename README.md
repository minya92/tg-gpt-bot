# tg-gpt-bot

Production-ready Telegram chatbot on **Node.js + TypeScript** with:
- **Telegraf** for Telegram integration
- **OpenRouter** as LLM backend
- JSON file storage (no DB)
- Per-user context and global model management

## Features

- Works only in **private chats**
- Access restricted by whitelist: `ALLOWED_USER_IDS`
- Separate conversation context for each allowed user
- Global system prompt from Markdown file (`./src/SYSTEM.md` by default)
- Single global selected model for all allowed users
- Any allowed user can:
  - view current model (`/model`)
  - list models (`/models [filter]`)
  - switch global model (`/setmodel <model_id>`)
- Streaming responses from OpenRouter with practical Telegram UX:
  - typing action
  - progressive `editMessageText`
  - continuation in additional messages when text is too long
- HTML parse mode for Telegram messages
- Safe HTML escaping
- Safe long text splitting for Telegram limits
- Persistent storage for model + sessions
- Graceful handling of missing/corrupted JSON store
- No logging of user messages or model responses

## Commands

- `/start`
- `/help`
- `/reset`
- `/new` (alias of `/reset`)
- `/model`
- `/models`
- `/models openai`
- `/models mistral`
- `/setmodel <model_id>`
- `/whoami`
- `/ping`

## Requirements

- Node.js 20+
- Telegram bot token
- OpenRouter API key

## Environment variables

Copy `.env.example` to `.env` and fill values:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ALLOWED_USER_IDS=123456789,987654321
DEFAULT_MODEL=openai/gpt-4o-mini
CONTEXT_LIMIT_MESSAGES=20
SYSTEM_PROMPT_FILE_PATH=./src/SYSTEM.md
STORE_FILE_PATH=./data/store.json
PORT=3005
```

Notes:
- `ALLOWED_USER_IDS` is comma-separated numeric Telegram user IDs.
- If `ALLOWED_USER_IDS` is empty, all users are denied.
- `CONTEXT_LIMIT_MESSAGES` limits stored per-user history length.
- `SYSTEM_PROMPT_FILE_PATH` defaults to `./src/SYSTEM.md` if not set.

## Local run

```bash
npm install
npm run dev
```

Build + start:

```bash
npm run build
npm start
```

## Docker

Run with Docker Compose:

```bash
docker compose up -d --build
```

The bot uses long polling by default.
Health endpoint is available at:
- `GET /health` on port `3005` (configurable via `PORT`)

## Scripts

- `npm run dev` — run in watch mode (`tsx`)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled app
- `npm run typecheck` — TypeScript type check without emit
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint autofix
- `npm run format` — Prettier write
- `npm run format:check` — Prettier check
- `npm test` — run tests
- `npm run test:watch` — watch tests

## Tests

Basic tests are included for:
- allowed user ID parsing
- command argument parsing
- JSON storage read/write and corrupted file recovery
- context reset
- model selection validation logic

## Project structure

```text
src/
  bot/
    createBot.ts
  services/
    appStateService.ts
    openRouterClient.ts
    telegramStreaming.ts
  storage/
    jsonStore.ts
  utils/
    allowedUsers.ts
    command.ts
    html.ts
    modelValidation.ts
    telegram.ts
  config.ts
  index.ts
  SYSTEM.md
  types.ts

tests/
```

## Security and privacy

- Bot ignores non-private chats.
- Non-whitelisted users are rejected.
- User and model text content is not logged.
- State is persisted only in local JSON file.
