import { describe, expect, it } from 'vitest';
import { renderModelTextToTelegramHtml } from '../src/utils/telegramFormat';

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
});
