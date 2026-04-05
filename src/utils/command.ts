export interface ParsedCommand {
  command: string;
  argsText: string;
  args: string[];
}

// Выделяет команду и аргументы из текста сообщения Telegram.
export function parseCommandAndArgs(text: string): ParsedCommand | null {
  const match = text.match(/^\/(?<command>[\w]+)(?:@[\w_]+)?(?:\s+(?<args>[\s\S]+))?$/);
  if (!match?.groups?.command) {
    return null;
  }

  const command = match.groups.command.toLowerCase();
  const argsText = (match.groups.args ?? '').trim();
  const args = argsText ? argsText.split(/\s+/) : [];

  return { command, argsText, args };
}

export function parseSetModelArg(text: string): string | null {
  const parsed = parseCommandAndArgs(text);
  if (!parsed || parsed.command !== 'setmodel') {
    return null;
  }
  return parsed.args[0] ?? null;
}

export function parseModelsFilter(text: string): string {
  const parsed = parseCommandAndArgs(text);
  if (!parsed || parsed.command !== 'models') {
    return '';
  }
  return parsed.argsText;
}
