import { describe, expect, it } from 'vitest';
import {
  convertMarkdownTablesToPseudo,
  renderModelTextToTelegramHtml
} from '../src/utils/telegramFormat';

describe('renderModelTextToTelegramHtml', () => {
  it('renders headings and inline styles', () => {
    const input = '### Заголовок\nТекст с **жирным** и `кодом`.';
    const output = renderModelTextToTelegramHtml(input);

    expect(output).toContain('<b>Заголовок</b>');
    expect(output).toContain('<b>жирным</b>');
    expect(output).toContain('<code>кодом</code>');
  });

  it('renders fenced code block as pre/code and escapes html inside', () => {
    const input = '```ts\nconst a = "<tag>";\n```';
    const output = renderModelTextToTelegramHtml(input);

    expect(output).toContain('<pre><code>const a = &quot;&lt;tag&gt;&quot;;</code></pre>');
  });

  it('converts markdown table to pseudographic table in code block', () => {
    const input = [
      '📊 Сравнение:',
      '',
      '| | C-Vit | Filling Effect |',
      '|---|---|---|',
      '| Сияние | ⭐️⭐️⭐️⭐️⭐️ | ⭐️⭐️ |'
    ].join('\n');

    const output = renderModelTextToTelegramHtml(input);

    expect(output).toContain('<pre><code>┌');
    expect(output).toContain('│ Сияние');
    expect(output).not.toContain('|---|---|---|');
  });

  it('does not convert markdown-like table inside fenced code block', () => {
    const input = '```md\n| A | B |\n|---|---|\n| 1 | 2 |\n```';
    const output = convertMarkdownTablesToPseudo(input);

    expect(output).toBe(input);
  });
});
