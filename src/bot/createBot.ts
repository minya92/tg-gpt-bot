import { Telegraf, Context } from 'telegraf';
import { AppConfig, OpenRouterChatMessage, OpenRouterModel } from '../types';
import { AppStateService } from '../services/appStateService';
import { OpenRouterClient } from '../services/openRouterClient';
import { parseCommandAndArgs, parseModelsFilter, parseSetModelArg } from '../utils/command';
import { isAllowedUser } from '../utils/allowedUsers';
import { filterModels, isModelAllowed } from '../utils/modelValidation';
import { replyPlainHtml } from '../utils/telegram';
import { streamTextToTelegram } from '../services/telegramStreaming';
import { renderModelTextToTelegramHtml } from '../utils/telegramFormat';

interface CreateBotDeps {
  stateService: AppStateService;
  openRouterClient: OpenRouterClient;
}

function buildHelpText(): string {
  return [
    'Доступные команды:',
    '/start - приветствие',
    '/help - список команд',
    '/reset - очистить ваш контекст',
    '/new - алиас команды /reset',
    '/model - текущая глобальная модель',
    '/models [фильтр] - список моделей OpenRouter',
    '/setmodel <model_id> - выбрать глобальную модель',
    '/whoami - информация о вашем Telegram аккаунте',
    '/ping - проверка работоспособности'
  ].join('\n');
}

function formatModelsList(models: OpenRouterModel[], filter: string): string {
  const title = filter
    ? `Доступные модели (фильтр: ${filter}):`
    : 'Доступные модели:';

  const lines = models.map((model, index) => {
    const details: string[] = [];

    if (model.name) {
      details.push(model.name);
    }
    if (model.context_length) {
      details.push(`ctx=${model.context_length}`);
    }

    if (details.length === 0) {
      return `${index + 1}. ${model.id}`;
    }

    return `${index + 1}. ${model.id} — ${details.join(', ')}`;
  });

  return `${title}\n${lines.join('\n')}`;
}

async function handleCommand(
  ctx: Context,
  text: string,
  deps: CreateBotDeps
): Promise<void> {
  const parsed = parseCommandAndArgs(text);
  if (!parsed) {
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    await replyPlainHtml(ctx, 'Не удалось определить пользователя.');
    return;
  }

  switch (parsed.command) {
    case 'start': {
      await replyPlainHtml(
        ctx,
        'Привет! Бот работает только в личных чатах и доступен по whitelist.\nИспользуйте /help для списка команд.'
      );
      return;
    }

    case 'help': {
      await replyPlainHtml(ctx, buildHelpText());
      return;
    }

    case 'reset':
    case 'new': {
      await deps.stateService.resetSession(userId);
      await replyPlainHtml(ctx, 'Ваш контекст очищен.');
      return;
    }

    case 'model': {
      await replyPlainHtml(ctx, `Текущая модель: ${deps.stateService.getCurrentModel()}`);
      return;
    }

    case 'models': {
      const filter = parseModelsFilter(text);
      const models = await deps.openRouterClient.listModels();
      const selected = filterModels(models, filter).sort((a, b) => a.id.localeCompare(b.id));

      if (selected.length === 0) {
        await replyPlainHtml(ctx, 'Модели не найдены по заданному фильтру.');
        return;
      }

      await replyPlainHtml(ctx, formatModelsList(selected, filter));
      return;
    }

    case 'setmodel': {
      const modelId = parseSetModelArg(text);
      if (!modelId) {
        await replyPlainHtml(ctx, 'Использование: /setmodel <model_id>');
        return;
      }

      const models = await deps.openRouterClient.listModels();
      if (!isModelAllowed(modelId, models)) {
        await replyPlainHtml(ctx, `Модель ${modelId} не найдена в каталоге OpenRouter.`);
        return;
      }

      await deps.stateService.setCurrentModel(modelId);
      await replyPlainHtml(ctx, `Глобальная модель изменена на: ${modelId}`);
      return;
    }

    case 'whoami': {
      const firstName = ctx.from?.first_name || 'не задано';
      const lastName = ctx.from?.last_name || '';
      const username = ctx.from?.username ? `@${ctx.from.username}` : 'не задан';

      await replyPlainHtml(
        ctx,
        `Ваш ID: ${userId}\nUsername: ${username}\nИмя: ${[firstName, lastName].join(' ').trim()}`
      );
      return;
    }

    case 'ping': {
      await replyPlainHtml(ctx, 'pong');
      return;
    }

    default: {
      await replyPlainHtml(ctx, 'Неизвестная команда. Используйте /help.');
    }
  }
}

export function createBot(config: AppConfig, deps: CreateBotDeps): Telegraf<Context> {
  const bot = new Telegraf<Context>(config.telegramBotToken);
  const activeUsers = new Set<number>();

  // Общая проверка: работаем только в private и только для whitelist.
  bot.use(async (ctx, next) => {
    if (!ctx.chat || ctx.chat.type !== 'private') {
      return;
    }

    if (!isAllowedUser(config.allowedUserIds, ctx.from?.id)) {
      await replyPlainHtml(ctx, 'Доступ запрещен.');
      return;
    }

    await next();
  });

  bot.on('message', async (ctx) => {
    try {
      if (!('text' in ctx.message)) {
        await replyPlainHtml(ctx, 'Сейчас поддерживаются только текстовые сообщения.');
        return;
      }

      const text = ctx.message.text.trim();
      if (!text) {
        return;
      }

      if (text.startsWith('/')) {
        await handleCommand(ctx, text, deps);
        return;
      }

      const userId = ctx.from?.id;
      if (!userId) {
        await replyPlainHtml(ctx, 'Не удалось определить пользователя.');
        return;
      }

      if (activeUsers.has(userId)) {
        await replyPlainHtml(ctx, 'Подождите завершения предыдущего ответа.');
        return;
      }

      activeUsers.add(userId);

      try {
        const history = deps.stateService.getSessionMessages(userId);

        const messages: OpenRouterChatMessage[] = [];
        if (config.systemPrompt.trim()) {
          messages.push({ role: 'system', content: config.systemPrompt.trim() });
        }

        for (const item of history) {
          messages.push({ role: item.role, content: item.content });
        }

        messages.push({ role: 'user', content: text });

        const fullText = await streamTextToTelegram(
          ctx,
          deps.openRouterClient.streamChatCompletion({
            model: deps.stateService.getCurrentModel(),
            messages
          }),
          {
            formatter: renderModelTextToTelegramHtml
          }
        );

        await deps.stateService.appendMessage(userId, 'user', text);
        await deps.stateService.appendMessage(userId, 'assistant', fullText || 'Пустой ответ модели.');
      } finally {
        activeUsers.delete(userId);
      }
    } catch (error) {
      void error;
      console.error('[bot] failed to process update');
      await replyPlainHtml(ctx, 'Произошла ошибка при обработке сообщения. Попробуйте позже.');
    }
  });

  bot.catch((error) => {
    void error;
    console.error('[bot] unhandled error');
  });

  return bot;
}
