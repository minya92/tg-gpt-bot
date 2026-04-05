export type StoredRole = 'user' | 'assistant';

export interface ChatMessage {
  role: StoredRole;
  content: string;
  createdAt: string;
}

export interface UserSession {
  userId: number;
  messages: ChatMessage[];
}

export interface AppState {
  currentModel: string;
  sessions: UserSession[];
}

export type OpenRouterRole = 'system' | 'user' | 'assistant';

export interface OpenRouterChatMessage {
  role: OpenRouterRole;
  content: string;
}

export interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
}

export interface AppConfig {
  telegramBotToken: string;
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  allowedUserIds: Set<number>;
  defaultModel: string;
  contextLimitMessages: number;
  systemPrompt: string;
  storeFilePath: string;
  port: number;
}
