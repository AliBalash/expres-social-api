import { Blob } from 'buffer';
import { Request, Response } from 'express';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const normalizeStringParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return normalizeStringParam(value[0]);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const normalizeStatus = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const upper = value.trim().toUpperCase();
  return upper === 'USED' || upper === 'UNUSED' ? upper : undefined;
};

const normalizeUploadType = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const lowered = value.trim().toLowerCase();
  return ['image', 'video', 'document'].includes(lowered)
    ? (lowered as 'image' | 'video' | 'document')
    : undefined;
};

const ALLOWED_MIME_TYPES = [
  'image/jpg',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/pdf',
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const normalizeMimeType = (value: unknown): AllowedMimeType => {
  if (typeof value !== 'string') {
    throw new HttpError(
      400,
      `mimeType must be one of ${ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  const normalized = value.trim().toLowerCase();
  const match = ALLOWED_MIME_TYPES.find((type) => type === normalized);

  if (!match) {
    throw new HttpError(
      400,
      `mimeType must be one of ${ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  return match;
};

export const listUploads = async (req: Request, res: Response) => {
  const uploads = await bundleClient.upload.uploadGetList({
    teamId: normalizeStringParam(req.query.teamId),
    status: normalizeStatus(req.query.status),
    type: normalizeUploadType(req.query.type),
  });

  res.json(uploads);
};

export const getUpload = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const upload = await bundleClient.upload.uploadGet({ id });
  res.json(upload);
};

export const createUpload = async (req: Request, res: Response) => {
  const teamId = normalizeStringParam(req.body?.teamId);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  if (!req.file) {
    throw new HttpError(400, 'file is required');
  }

  const blob = new Blob([req.file.buffer], {
    type: req.file.mimetype,
  });

  const upload = await bundleClient.upload.uploadCreate({
    formData: {
      teamId,
      file: blob,
    },
  });

  res.status(201).json(upload);
};

export const initLargeUpload = async (req: Request, res: Response) => {
  const { teamId, fileName, mimeType } = req.body ?? {};

  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new HttpError(400, 'fileName is required');
  }

  if (typeof mimeType !== 'string' || mimeType.trim().length === 0) {
    throw new HttpError(400, 'mimeType is required');
  }

  const upload = await bundleClient.upload.uploadInitLargeUpload({
    requestBody: {
      teamId: normalizeStringParam(teamId),
      fileName: fileName.trim(),
      mimeType: normalizeMimeType(mimeType),
    },
  });

  res.status(201).json(upload);
};

export const finalizeLargeUpload = async (req: Request, res: Response) => {
  const { teamId, path } = req.body ?? {};

  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new HttpError(400, 'path is required');
  }

  const upload = await bundleClient.upload.uploadFinalizeLargeUpload({
    requestBody: {
      teamId: normalizeStringParam(teamId),
      path: path.trim(),
    },
  });

  res.json(upload);
};
