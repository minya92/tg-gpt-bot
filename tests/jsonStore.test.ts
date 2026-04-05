import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from '../src/storage/jsonStore';
import { AppState } from '../src/types';

describe('JsonStore', () => {
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

  it('creates default state when file does not exist', async () => {
    const store = new JsonStore(storePath, createDefaultState);

    const state = await store.load();

    expect(state.currentModel).toBe('openai/gpt-4o-mini');

    const fileContent = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(fileContent) as AppState;
    expect(parsed.currentModel).toBe('openai/gpt-4o-mini');
  });

  it('writes and reads state', async () => {
    const store = new JsonStore(storePath, createDefaultState);

    await store.save({
      currentModel: 'mistral/mistral-large',
      sessions: [
        {
          userId: 123,
          messages: [
            {
              role: 'user',
              content: 'test',
              createdAt: new Date().toISOString()
            }
          ]
        }
      ]
    });

    const loaded = await store.load();
    expect(loaded.currentModel).toBe('mistral/mistral-large');
    expect(loaded.sessions.length).toBe(1);
    expect(loaded.sessions[0].userId).toBe(123);
  });

  it('restores default state when json is corrupted', async () => {
    await writeFile(storePath, '{broken', 'utf8');
    const store = new JsonStore(storePath, createDefaultState);

    const loaded = await store.load();

    expect(loaded.currentModel).toBe('openai/gpt-4o-mini');
    expect(loaded.sessions).toEqual([]);
  });
});
