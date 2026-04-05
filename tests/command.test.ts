import { describe, expect, it } from 'vitest';
import { parseCommandAndArgs, parseModelsFilter, parseSetModelArg } from '../src/utils/command';

describe('command parsing', () => {
  it('parses command and args', () => {
    const parsed = parseCommandAndArgs('/setmodel openai/gpt-4o-mini');

    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe('setmodel');
    expect(parsed?.args).toEqual(['openai/gpt-4o-mini']);
    expect(parsed?.argsText).toBe('openai/gpt-4o-mini');
  });

  it('parses command with bot mention', () => {
    const parsed = parseCommandAndArgs('/models@mybot mistral');

    expect(parsed?.command).toBe('models');
    expect(parsed?.argsText).toBe('mistral');
  });

  it('parses model commands helpers', () => {
    expect(parseSetModelArg('/setmodel anthropic/claude-3.7-sonnet')).toBe(
      'anthropic/claude-3.7-sonnet'
    );
    expect(parseSetModelArg('/setmodel')).toBeNull();
    expect(parseModelsFilter('/models openai')).toBe('openai');
    expect(parseModelsFilter('/models')).toBe('');
  });

  it('returns null for non-command text', () => {
    expect(parseCommandAndArgs('hello')).toBeNull();
  });
});
