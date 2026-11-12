import { buildApp } from './app.ts';
import { loadEnv } from './env.ts';

const env = loadEnv();
const app = await buildApp({ env });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

try {
  await app.listen({ port: env.API_PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
