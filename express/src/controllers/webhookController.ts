import { Request, Response } from 'express';
import { Bundlesocial } from 'bundlesocial';
import env from '../config/env';

const webhookClient = new Bundlesocial(env.apiKey);

export const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-signature'];

  if (!signature) {
    return res.status(400).json({ message: 'Missing x-signature header' });
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));

  const event = webhookClient.webhooks.constructEvent(
    rawBody.toString('utf8'),
    signature as string,
    env.webhookSecret,
  );

  console.log(`[Webhook] ${event.type}`, event.data);

  res.json({
    received: true,
    type: event.type,
  });
};

export default handleWebhook;
