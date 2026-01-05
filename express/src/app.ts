import express from 'express';
import asyncHandler from './middleware/asyncHandler';
import errorHandler from './middleware/errorHandler';
import notFoundHandler from './middleware/notFoundHandler';
import { handleWebhook } from './controllers/webhookController';
import apiV1Routes from './routes/v1';
import instagramRoutes from './instagram/routes';

const app = express();

app.get('/', (_req, res) => {
  res.send('bundle.social Instagram backend is running');
});

app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(handleWebhook),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', apiV1Routes);
app.use('/api/instagram', instagramRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
