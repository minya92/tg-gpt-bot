import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppStateService } from '../src/services/appStateService';
import { JsonStore } from '../src/storage/jsonStore';
import { AppState } from '../src/types';

describe('AppStateService context reset', () => {
  let tempDir = '';
  let storePath = '';

  const createDefaultState = (): AppState => ({
    currentModel: 'openai/gpt-4o-mini',
    sessions: []
  });

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'tg-gpt-bot-'));
    storePath = path.join(tempDir, 'store.json');
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('clears current user context', async () => {
    const store = new JsonStore(storePath, createDefaultState);
    const stateService = new AppStateService(store, 'openai/gpt-4o-mini', 20);
    await stateService.init();

    await stateService.appendMessage(123, 'user', 'hi');
    await stateService.appendMessage(123, 'assistant', 'hello');

    expect(stateService.getSessionMessages(123).length).toBe(2);

    await stateService.resetSession(123);

    expect(stateService.getSessionMessages(123)).toEqual([]);
  });
});
