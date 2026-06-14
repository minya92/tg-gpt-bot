import { Context } from 'telegraf';
import {
  editRichMarkdown,
  sendRichMarkdown,
  splitTelegramText,
  TELEGRAM_SAFE_TEXT_LIMIT
} from '../utils/telegram';

interface StreamRenderState {
  messageIds: number[];
  renderedChunks: string[];
}

async function safeEditMessage(ctx: Context, messageId: number, markdown: string): Promise<void> {
  try {
    await editRichMarkdown(ctx, messageId, markdown);
  } catch (error) {
    const telegramError = error as { description?: string };
    if (telegramError.description?.includes('message is not modified')) {
      return;
    }
    throw error;
  }
}

async function renderChunks(
  ctx: Context,
  state: StreamRenderState,
  text: string,
  maxLength: number
): Promise<void> {
  const chunks = splitTelegramText(text || '…', maxLength);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    if (state.renderedChunks[i] === chunk) {
      continue;
    }

    if (i < state.messageIds.length) {
      await safeEditMessage(ctx, state.messageIds[i], chunk);
      continue;
    }

    const message = await sendRichMarkdown(ctx, chunk);
    state.messageIds.push(message.message_id);
  }

  state.renderedChunks = chunks;
}

// Рисует потоковый ответ: typing + прогрессивные editMessageText + перенос в новые сообщения.
export async function streamTextToTelegram(
  ctx: Context,
  chunkStream: AsyncIterable<string>,
  options?: {
    maxLength?: number;
    flushIntervalMs?: number;
  }
): Promise<string> {
  const maxLength = options?.maxLength ?? TELEGRAM_SAFE_TEXT_LIMIT;
  const flushIntervalMs = options?.flushIntervalMs ?? 900;

  const firstMessage = await sendRichMarkdown(ctx, '…');

  const state: StreamRenderState = {
    messageIds: [firstMessage.message_id],
    renderedChunks: ['…']
  };

  let fullText = '';
  let lastFlushAt = 0;

  const typingInterval = setInterval(() => {
    void ctx.sendChatAction('typing').catch(() => undefined);
  }, 4000);

  await ctx.sendChatAction('typing').catch(() => undefined);

  try {
    for await (const chunk of chunkStream) {
      fullText += chunk;
      const now = Date.now();
      if (now - lastFlushAt >= flushIntervalMs) {
        lastFlushAt = now;
        await renderChunks(ctx, state, fullText, maxLength);
      }
    }

    await renderChunks(ctx, state, fullText || 'Пустой ответ модели.', maxLength);
  } finally {
    clearInterval(typingInterval);
  }

  return fullText;
}
