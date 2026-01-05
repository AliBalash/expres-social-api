import { Request, Response } from 'express';
import bundleClient from '../../services/bundleSocialClient';

export const getHealth = async (_req: Request, res: Response) => {
  const health = await bundleClient.app.appGetHealth();
  res.json(health);
};

export default getHealth;
