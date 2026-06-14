import { describe, expect, it, vi } from 'vitest';
import { buildInputRichMarkdown, editRichMarkdown, sendRichMarkdown } from '../src/utils/telegram';

describe('rich markdown telegram helpers', () => {
  it('keeps model markdown unchanged for Telegram Rich Markdown', () => {
    const markdown = [
      '### Заголовок',
      'Текст с **жирным** и `кодом`.',
      '',
      '| Metric | Value |',
      '|:-------|------:|',
      '| Speed  | **42** |',
    ].join('\n');

    expect(buildInputRichMarkdown(markdown)).toEqual({ markdown });
  });

  it('sends native rich markdown messages', async () => {
    const callApi = vi.fn().mockResolvedValue({ message_id: 123 });
    const ctx = {
      chat: { id: 42 },
      telegram: { callApi },
    };

    const message = await sendRichMarkdown(ctx as never, '**hello**');

    expect(message.message_id).toBe(123);
    expect(callApi).toHaveBeenCalledWith('sendRichMessage', {
      chat_id: 42,
      rich_message: { markdown: '**hello**' },
    });
  });

  it('edits messages using rich_message instead of parse_mode rendering', async () => {
    const callApi = vi.fn().mockResolvedValue(true);
    const ctx = {
      chat: { id: 42 },
      telegram: { callApi },
    };

    await editRichMarkdown(ctx as never, 123, '| A | B |\n|---|---|\n| 1 | 2 |');

    expect(callApi).toHaveBeenCalledWith('editMessageText', {
      chat_id: 42,
      message_id: 123,
      rich_message: { markdown: '| A | B |\n|---|---|\n| 1 | 2 |' },
    });
  });
});
