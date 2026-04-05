import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppState, ChatMessage, UserSession } from '../types';

function isValidMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<ChatMessage>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'string'
  );
}

function isValidSession(value: unknown): value is UserSession {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const session = value as Partial<UserSession>;
  return (
    typeof session.userId === 'number' &&
    Number.isInteger(session.userId) &&
    Array.isArray(session.messages) &&
    session.messages.every(isValidMessage)
  );
}

function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const state = value as Partial<AppState>;
  return (
    typeof state.currentModel === 'string' &&
    state.currentModel.length > 0 &&
    Array.isArray(state.sessions) &&
    state.sessions.every(isValidSession)
  );
}

function cloneState(state: AppState): AppState {
  return {
    currentModel: state.currentModel,
    sessions: state.sessions.map((session) => ({
      userId: session.userId,
      messages: session.messages.map((message) => ({ ...message }))
    }))
  };
}

export class JsonStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly createDefaultState: () => AppState
  ) {}

  // Читает состояние, а при отсутствии/повреждении файла восстанавливает дефолт.
  async load(): Promise<AppState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidState(parsed)) {
        return await this.resetToDefault();
      }
      return cloneState(parsed);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return await this.resetToDefault();
      }
      if (error instanceof SyntaxError) {
        return await this.resetToDefault();
      }
      throw error;
    }
  }

  // Атомарно сохраняет JSON на диск через временный файл.
  async save(state: AppState): Promise<void> {
    const safeState = cloneState(state);

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmpFilePath = `${this.filePath}.tmp`;
      const payload = JSON.stringify(safeState, null, 2);
      await writeFile(tmpFilePath, payload, 'utf8');
      await rename(tmpFilePath, this.filePath);
    });

    await this.writeQueue;
  }

  private async resetToDefault(): Promise<AppState> {
    const defaultState = this.createDefaultState();
    await this.save(defaultState);
    return cloneState(defaultState);
  }
}
