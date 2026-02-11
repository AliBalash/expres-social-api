import { Request, Response } from 'express';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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

export const createPostImport = async (req: Request, res: Response) => {
  const result = await bundleClient.postImport.postImportCreate({
    requestBody: req.body,
  });

  res.status(201).json(result);
};

export const getPostImportStatus = async (req: Request, res: Response) => {
  const teamId = coerceString(req.query.teamId);
  const socialAccountType = coerceString(req.query.socialAccountType);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }
  if (!socialAccountType) {
    throw new HttpError(400, 'socialAccountType is required');
  }

  const result = await bundleClient.postImport.postImportGetStatus({
    teamId,
    socialAccountType: socialAccountType as never,
  });

  res.json(result);
};

export const getPostImportById = async (req: Request, res: Response) => {
  const importId = coerceString(req.params.importId);

  if (!importId) {
    throw new HttpError(400, 'importId is required');
  }

  const result = await bundleClient.postImport.postImportGetById({
    importId,
  });

  res.json(result);
};

export const getImportedPosts = async (req: Request, res: Response) => {
  const teamId = coerceString(req.query.teamId);
  const socialAccountType = coerceString(req.query.socialAccountType);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }
  if (!socialAccountType) {
    throw new HttpError(400, 'socialAccountType is required');
  }

  const result = await bundleClient.postImport.postImportGetImportedPosts({
    teamId,
    socialAccountType: socialAccountType as never,
    limit: parseNumberParam(req.query.limit),
    offset: parseNumberParam(req.query.offset),
  });

  res.json(result);
};

export const retryPostImport = async (req: Request, res: Response) => {
  const importId = coerceString(req.params.importId);

  if (!importId) {
    throw new HttpError(400, 'importId is required');
  }

  const result = await bundleClient.postImport.postImportRetryImport({
    importId,
    requestBody: req.body,
  });

  res.json(result);
};

