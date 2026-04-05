import { Context } from 'telegraf';
import { escapeHtml } from './html';

export const TELEGRAM_SAFE_TEXT_LIMIT = 3500;

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
