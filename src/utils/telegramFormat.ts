import { escapeHtml } from './html';

const CODE_BLOCK_PLACEHOLDER = '__TG_CODE_BLOCK_';

// Преобразует markdown-подобный текст модели в HTML, поддерживаемый Telegram.
export function renderModelTextToTelegramHtml(input: string): string {
  const codeBlocks: string[] = [];

  const withPlaceholders = input.replace(/```(?:[^\n`]*)\n?([\s\S]*?)```/g, (_, code: string) => {
    const html = `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`;
    const index = codeBlocks.push(html) - 1;
    return `${CODE_BLOCK_PLACEHOLDER}${index}__`;
  });

  let rendered = escapeHtml(withPlaceholders);

  rendered = rendered.replace(/^(#{1,6})\s+(.+)$/gm, (_, _hashes: string, title: string) => {
    return `<b>${title.trim()}</b>`;
  });

  rendered = rendered.replace(/\*\*([^*\n][\s\S]*?)\*\*/g, '<b>$1</b>');
  rendered = rendered.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<i>$2</i>');
  rendered = rendered.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  for (let i = 0; i < codeBlocks.length; i += 1) {
    rendered = rendered.replace(`${CODE_BLOCK_PLACEHOLDER}${i}__`, codeBlocks[i]);
  }

  return rendered;
}

