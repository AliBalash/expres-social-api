import app from './app';
import env from './config/env';

const server = app.listen(env.port, () => {
  console.log(
    `bundle.social Instagram backend running on http://localhost:${env.port}`,
  );
});

const shutdown = () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
