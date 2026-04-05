import { AppState, ChatMessage, StoredRole, UserSession } from '../types';
import { JsonStore } from '../storage/jsonStore';

function cloneMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({ ...message }));
}

export class AppStateService {
  private state: AppState;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: JsonStore,
    private readonly defaultModel: string,
    private readonly contextLimitMessages: number
  ) {
    this.state = {
      currentModel: defaultModel,
      sessions: []
    };
  }

  async init(): Promise<void> {
    this.state = await this.store.load();

    if (!this.state.currentModel) {
      this.state.currentModel = this.defaultModel;
      await this.store.save(this.state);
    }
  }

  getCurrentModel(): string {
    return this.state.currentModel;
  }

  getSessionMessages(userId: number): ChatMessage[] {
    const session = this.findSession(userId);
    if (!session) {
      return [];
    }
    return cloneMessages(session.messages);
  }

  async setCurrentModel(modelId: string): Promise<void> {
    await this.mutate(async () => {
      this.state.currentModel = modelId;
      await this.store.save(this.state);
    });
  }

  async appendMessage(userId: number, role: StoredRole, content: string): Promise<void> {
    await this.mutate(async () => {
      const session = this.getOrCreateSession(userId);
      session.messages.push({
        role,
        content,
        createdAt: new Date().toISOString()
      });
      session.messages = this.trimToLimit(session.messages);
      await this.store.save(this.state);
    });
  }

  async resetSession(userId: number): Promise<void> {
    await this.mutate(async () => {
      const session = this.getOrCreateSession(userId);
      session.messages = [];
      await this.store.save(this.state);
    });
  }

  private trimToLimit(messages: ChatMessage[]): ChatMessage[] {
    const limit = Math.max(1, this.contextLimitMessages);
    if (messages.length <= limit) {
      return messages;
    }
    return messages.slice(-limit);
  }

  private getOrCreateSession(userId: number): UserSession {
    const existing = this.findSession(userId);
    if (existing) {
      return existing;
    }

    const created: UserSession = {
      userId,
      messages: []
    };
    this.state.sessions.push(created);
    return created;
  }

  private findSession(userId: number): UserSession | undefined {
    return this.state.sessions.find((session) => session.userId === userId);
  }

  private async mutate(action: () => Promise<void>): Promise<void> {
    const run = this.mutationQueue.then(action, action);
    this.mutationQueue = run.catch(() => undefined);
    await run;
  }
}
