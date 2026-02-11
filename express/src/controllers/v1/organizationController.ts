import { Request, Response } from 'express';
import bundleClient from '../../services/bundleSocialClient';

export const getOrganization = async (_req: Request, res: Response) => {
  const organization = await bundleClient.organization.organizationGetOrganization();
  res.json(organization);
};

const parseNumberParam = (value: unknown): number | undefined => {
  if (Array.isArray(value)) {
    return parseNumberParam(value[0]);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const getPostsUsage = async (_req: Request, res: Response) => {
  const usage = await bundleClient.organization.organizationGetPostsUsage();
  res.json(usage);
};

export const getUploadsUsage = async (_req: Request, res: Response) => {
  const usage = await bundleClient.organization.organizationGetUploadsUsage();
  res.json(usage);
};

export const getImportsUsage = async (req: Request, res: Response) => {
  const usage = await bundleClient.organization.organizationGetImportsUsage({
    page: parseNumberParam(req.query.page),
    pageSize: parseNumberParam(req.query.pageSize),
    teamId: coerceString(req.query.teamId),
    socialAccountType: coerceString(req.query.socialAccountType) as never,
    socialAccountId: coerceString(req.query.socialAccountId),
  });

  res.json(usage);
};

export default getOrganization;
