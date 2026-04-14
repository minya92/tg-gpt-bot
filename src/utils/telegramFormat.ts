import { escapeHtml } from './html';

const CODE_BLOCK_PLACEHOLDER = '__TG_CODE_BLOCK_';

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) {
    return null;
  }

  const normalized = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells = normalized
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());

  if (cells.length < 2) {
    return null;
  }

  return cells;
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = parseMarkdownTableRow(line);
  if (!cells) {
    return false;
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function visibleWidth(value: string): number {
  return Array.from(value.replace(/[\uFE0E\uFE0F]/g, '')).length;
}

function renderPseudoTable(rows: string[][]): string {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const normalizedRows = rows.map((row) => {
    const normalized = [...row];
    while (normalized.length < columnCount) {
      normalized.push('');
    }
    return normalized;
  });

  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxWidth = normalizedRows.reduce((max, row) => {
      return Math.max(max, visibleWidth(row[columnIndex]));
    }, 0);
    return Math.max(1, maxWidth);
  });

  const buildBorder = (left: string, center: string, right: string): string => {
    const segments = widths.map((width) => '─'.repeat(width + 2));
    return `${left}${segments.join(center)}${right}`;
  };

  const renderRow = (row: string[]): string => {
    const cells = row.map((cell, index) => {
      const pad = widths[index] - visibleWidth(cell);
      return `${cell}${' '.repeat(Math.max(0, pad))}`;
    });
    return `│ ${cells.join(' │ ')} │`;
  };

  const lines: string[] = [];
  lines.push(buildBorder('┌', '┬', '┐'));
  lines.push(renderRow(normalizedRows[0]));
  lines.push(buildBorder('├', '┼', '┤'));

  for (let i = 1; i < normalizedRows.length; i += 1) {
    lines.push(renderRow(normalizedRows[i]));
  }

  lines.push(buildBorder('└', '┴', '┘'));
  return lines.join('\n');
}

export function convertMarkdownTablesToPseudo(input: string): string {
  if (!input.includes('|')) {
    return input;
  }

  const lines = input.split('\n');
  const output: string[] = [];
  let index = 0;
  let inCodeFence = false;

  while (index < lines.length) {
    const currentLine = lines[index];

    if (/^\s*```/.test(currentLine)) {
      inCodeFence = !inCodeFence;
      output.push(currentLine);
      index += 1;
      continue;
    }

    if (!inCodeFence && index + 1 < lines.length) {
      const header = parseMarkdownTableRow(currentLine);
      const separator = lines[index + 1];

      if (header && isMarkdownTableSeparator(separator)) {
        const rows: string[][] = [header];
        index += 2;

        while (index < lines.length) {
          const row = parseMarkdownTableRow(lines[index]);
          if (!row) {
            break;
          }
          rows.push(row);
          index += 1;
        }

        output.push('```');
        output.push(renderPseudoTable(rows));
        output.push('```');
        continue;
      }
    }

    output.push(currentLine);
    index += 1;
  }

  return output.join('\n');
}

// Преобразует markdown-подобный текст модели в HTML, поддерживаемый Telegram.
export function renderModelTextToTelegramHtml(input: string): string {
  const codeBlocks: string[] = [];
  const normalizedInput = convertMarkdownTablesToPseudo(input);

  const withPlaceholders = normalizedInput.replace(
    /```(?:[^\n`]*)\n?([\s\S]*?)```/g,
    (_, code: string) => {
    const html = `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`;
    const index = codeBlocks.push(html) - 1;
    return `${CODE_BLOCK_PLACEHOLDER}${index}__`;
    }
  );

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
