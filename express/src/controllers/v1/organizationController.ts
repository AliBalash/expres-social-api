import { Request, Response } from 'express';
import bundleClient from '../../services/bundleSocialClient';

export const getOrganization = async (_req: Request, res: Response) => {
  const organization = await bundleClient.organization.organizationGetOrganization();
  res.json(organization);
};

export default getOrganization;
