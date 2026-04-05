import http from 'node:http';
import { createBot } from './bot/createBot';
import { loadConfig } from './config';
import { AppStateService } from './services/appStateService';
import { OpenRouterClient } from './services/openRouterClient';
import { JsonStore } from './storage/jsonStore';
import { AppState } from './types';

function createDefaultState(defaultModel: string): AppState {
  return {
    currentModel: defaultModel,
    sessions: []
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  if (config.allowedUserIds.size === 0) {
    console.warn('[startup] ALLOWED_USER_IDS is empty; all users will be denied.');
  }

  const store = new JsonStore(config.storeFilePath, () => createDefaultState(config.defaultModel));
  const stateService = new AppStateService(store, config.defaultModel, config.contextLimitMessages);
  await stateService.init();

  const openRouterClient = new OpenRouterClient(config.openRouterApiKey, config.openRouterBaseUrl);
  const bot = createBot(config, { stateService, openRouterClient });

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });

  healthServer.listen(config.port, () => {
    console.info(`[startup] health server is listening on port ${config.port}`);
  });

  await bot.launch();
  console.info('[startup] bot launched with long polling');

  const shutdown = async (signal: string): Promise<void> => {
    console.info(`[shutdown] received ${signal}`);
    bot.stop(signal);
    healthServer.close();
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[startup] failed: ${message}`);
  process.exit(1);
});
