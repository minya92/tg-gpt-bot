import { Context } from 'telegraf';
import { escapeHtml } from './html';

export const TELEGRAM_SAFE_TEXT_LIMIT = 3500;

interface TelegramCallApi {
  callApi(method: string, payload: Record<string, unknown>): Promise<unknown>;
}

interface TelegramSentMessage {
  message_id: number;
}

export interface InputRichMarkdownMessage {
  markdown: string;
}

function getChatId(ctx: Context): number | string {
  if (!ctx.chat) {
    throw new Error('Telegram chat is not available in context.');
  }

  return ctx.chat.id;
}

function getTelegramApi(ctx: Context): TelegramCallApi {
  return ctx.telegram as unknown as TelegramCallApi;
}

export function buildInputRichMarkdown(markdown: string): InputRichMarkdownMessage {
  return {
    markdown: markdown || '…'
  };
}

// Безопасно делит длинный текст для отправки в Telegram.
export function splitTelegramText(text: string, maxLength = TELEGRAM_SAFE_TEXT_LIMIT): string[] {
  if (!text) {
    return [''];
  }

  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    const window = text.slice(start, end);
    let splitAt = window.lastIndexOf('\n');

    if (splitAt < Math.floor(maxLength * 0.5)) {
      splitAt = window.lastIndexOf(' ');
    }

    if (splitAt <= 0) {
      splitAt = window.length;
    }

    const chunk = text.slice(start, start + splitAt).trimEnd();
    chunks.push(chunk);

    start += splitAt;
    while (start < text.length && /\s/.test(text[start])) {
      start += 1;
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

export async function replyPlainHtml(ctx: Context, plainText: string): Promise<void> {
  const chunks = splitTelegramText(plainText);
  for (const chunk of chunks) {
    await ctx.reply(escapeHtml(chunk), {
      parse_mode: 'HTML'
    });
  }
}

export async function sendRichMarkdown(
  ctx: Context,
  markdown: string
): Promise<TelegramSentMessage> {
  const message = await getTelegramApi(ctx).callApi('sendRichMessage', {
    chat_id: getChatId(ctx),
    rich_message: buildInputRichMarkdown(markdown)
  });

  return message as TelegramSentMessage;
}

export async function editRichMarkdown(
  ctx: Context,
  messageId: number,
  markdown: string
): Promise<void> {
  await getTelegramApi(ctx).callApi('editMessageText', {
    chat_id: getChatId(ctx),
    message_id: messageId,
    rich_message: buildInputRichMarkdown(markdown)
  });
}
