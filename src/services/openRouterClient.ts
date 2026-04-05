import { OpenRouterChatMessage, OpenRouterModel } from '../types';

interface ListModelsResponse {
  data?: OpenRouterModel[];
}

interface StreamDeltaResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenRouterClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {}

  // Получает каталог моделей OpenRouter.
  async listModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenRouter models request failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as ListModelsResponse;
    if (!payload.data || !Array.isArray(payload.data)) {
      return [];
    }

    return payload.data
      .filter((model): model is OpenRouterModel => typeof model.id === 'string' && model.id.length > 0)
      .map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length
      }));
  }

  // Выполняет стриминг генерации и возвращает текст по чанкам.
  async *streamChatCompletion(params: {
    model: string;
    messages: OpenRouterChatMessage[];
  }): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenRouter completion failed: ${response.status} ${details}`);
    }

    if (!response.body) {
      throw new Error('OpenRouter completion failed: empty response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let lineBreakIndex = buffer.indexOf('\n');
      while (lineBreakIndex >= 0) {
        const line = buffer.slice(0, lineBreakIndex).trim();
        buffer = buffer.slice(lineBreakIndex + 1);

        if (!line || !line.startsWith('data:')) {
          lineBreakIndex = buffer.indexOf('\n');
          continue;
        }

        const rawPayload = line.slice('data:'.length).trim();
        if (rawPayload === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(rawPayload) as StreamDeltaResponse;

          if (parsed.error?.message) {
            throw new Error(`OpenRouter stream error: ${parsed.error.message}`);
          }

          const chunk = parsed.choices?.[0]?.delta?.content;
          if (typeof chunk === 'string' && chunk.length > 0) {
            yield chunk;
          }
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('OpenRouter stream error:')) {
            throw error;
          }
          // Игнорируем невалидные служебные строки стрима.
        }

        lineBreakIndex = buffer.indexOf('\n');
      }
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`
    };
  }
}
