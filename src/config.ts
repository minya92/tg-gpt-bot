import path from 'node:path';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { AppConfig } from './types';
import { parseAllowedUserIds } from './utils/allowedUsers';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

// Загружает системный промпт из Markdown-файла без аварийного завершения.
function loadSystemPrompt(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      console.warn(`[startup] failed to read system prompt file: ${filePath}`);
    }
    return '';
  }
}

export function loadConfig(): AppConfig {
  const allowedUserIds = parseAllowedUserIds(process.env.ALLOWED_USER_IDS);
  const systemPromptFilePath = path.resolve(
    process.env.SYSTEM_PROMPT_FILE_PATH?.trim() || './src/SYSTEM.md'
  );

  return {
    telegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY'),
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1',
    allowedUserIds,
    defaultModel: process.env.DEFAULT_MODEL?.trim() || 'openai/gpt-4o-mini',
    contextLimitMessages: parsePositiveInt(process.env.CONTEXT_LIMIT_MESSAGES, 20),
    systemPrompt: loadSystemPrompt(systemPromptFilePath),
    storeFilePath: path.resolve(process.env.STORE_FILE_PATH?.trim() || './store.json'),
    port: parsePositiveInt(process.env.PORT, 3005)
  };
}
