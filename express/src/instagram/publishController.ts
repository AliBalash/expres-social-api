import path from 'path';
import { Request, Response } from 'express';
import HttpError from '../errors/HttpError';
import env from '../config/env';
import instagramService from './service';
import { InstagramMediaType, InstagramTag } from './types';

const MAX_CAPTION_LENGTH = 2000;
const MAX_COLLABORATORS = 3;
const MAX_TAGGED_USERS = 20;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB (Instagram limit)
const MAX_SIMPLE_UPLOAD_BYTES = 25 * 1024 * 1024; // bundle.social simple upload image limit

const ALLOWED_IMAGE_MIMES = new Set(['image/jpg', 'image/jpeg', 'image/png']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4']);

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (Array.isArray(value)) {
    return coerceBoolean(value[0]);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (Array.isArray(value)) {
    return coerceNumber(value[0]);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    // JSON array string takes precedence
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseStringArray(parsed);
      } catch {
        // fall back to CSV
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const parseTaggedUsers = (value: unknown): InstagramTag[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw =
    typeof value === 'string'
      ? (() => {
          const trimmed = value.trim();
          if (!trimmed) return undefined;
          try {
            return JSON.parse(trimmed);
          } catch {
            throw new HttpError(
              400,
              'tagged must be a JSON array (e.g. [{"username":"user","x":0.5,"y":0.5}])',
            );
          }
        })()
      : value;

  if (!Array.isArray(raw)) {
    throw new HttpError(400, 'tagged must be a JSON array');
  }

  const tags: InstagramTag[] = raw.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(400, 'tagged items must be objects');
    }

    const obj = item as Record<string, unknown>;
    const username =
      typeof obj.username === 'string' && obj.username.trim()
        ? obj.username.trim()
        : undefined;
    const x = typeof obj.x === 'number' ? obj.x : Number(obj.x);
    const y = typeof obj.y === 'number' ? obj.y : Number(obj.y);

    if (!username) {
      throw new HttpError(400, 'tagged.username is required');
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new HttpError(400, 'tagged.x and tagged.y must be numbers');
    }

    return { username, x, y };
  });

  return tags.length ? tags : undefined;
};

const resolveMimeType = (
  file: Express.Multer.File,
): string | undefined => {
  const reported =
    typeof file.mimetype === 'string' ? file.mimetype.trim().toLowerCase() : '';

  if (reported && reported !== 'application/octet-stream') {
    return reported;
  }

  const ext = path.extname(file.originalname ?? '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.mp4') {
    return 'video/mp4';
  }

  return reported || undefined;
};

const collectFiles = (req: Request): Express.Multer.File[] => {
  const files: Express.Multer.File[] = [];

  if (Array.isArray(req.files)) {
    return req.files as Express.Multer.File[];
  }

  const map = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (!map) {
    return [];
  }

  for (const items of Object.values(map)) {
    files.push(...items);
  }

  return files;
};

const validateMedia = (
  files: Express.Multer.File[],
  expectedType: InstagramMediaType,
) => {
  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    const mime = resolveMimeType(file);
    if (!mime) {
      throw new HttpError(400, 'Unable to detect file mime type');
    }

    const isImage = ALLOWED_IMAGE_MIMES.has(mime);
    const isVideo = ALLOWED_VIDEO_MIMES.has(mime);

    if (!isImage && !isVideo) {
      throw new HttpError(
        400,
        `Unsupported file type: ${mime}. Accepted: image/jpg, image/jpeg, image/png, video/mp4`,
      );
    }

    if (expectedType === 'REEL' && !isVideo) {
      throw new HttpError(400, 'Reels require a video/mp4 file');
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      throw new HttpError(
        400,
        `Image too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Instagram allows max 8MB per image.`,
      );
    }

    if (file.size > MAX_SIMPLE_UPLOAD_BYTES) {
      throw new HttpError(
        400,
        `File too large for simple upload: ${(file.size / 1024 / 1024).toFixed(2)}MB. Use /api/v1/upload/init + PUT + /api/v1/upload/finalize for large uploads.`,
      );
    }
  }
};

const publishWithType =
  (type: InstagramMediaType, maxFiles: number) =>
  async (req: Request, res: Response) => {
    const teamId = env.defaultTeamId;
    if (!teamId) {
      throw new HttpError(
        500,
        'BUNDLESOCIAL_DEFAULT_TEAM_ID is not set (required to hide teamId from the client)',
      );
    }

    const caption =
      coerceString(req.body?.caption) ?? coerceString(req.body?.text);

    if (!caption) {
      throw new HttpError(400, 'caption is required');
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      throw new HttpError(
        400,
        `caption is too long (${caption.length}). Max is ${MAX_CAPTION_LENGTH} characters.`,
      );
    }

    const statusRaw = coerceString(req.body?.status)?.toUpperCase();
    const status =
      statusRaw === 'DRAFT' || statusRaw === 'SCHEDULED'
        ? (statusRaw as 'DRAFT' | 'SCHEDULED')
        : undefined;

    const postDate = coerceString(req.body?.postDate);
    if (postDate) {
      const parsed = new Date(postDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new HttpError(
          400,
          'postDate must be a valid ISO 8601 date string',
        );
      }
    }

    const files = collectFiles(req);
    if (files.length > maxFiles) {
      throw new HttpError(400, `Max ${maxFiles} files allowed`);
    }

    const uploadIdsInput =
      parseStringArray(req.body?.uploadIds) ??
      parseStringArray(req.body?.uploadId);

    if (files.length === 0 && (!uploadIdsInput || uploadIdsInput.length === 0)) {
      throw new HttpError(400, 'Provide at least one file or uploadIds');
    }

    validateMedia(files, type);

    const uploads = [];
    const uploadIds: string[] = [...(uploadIdsInput ?? [])];

    for (const file of files) {
      const mime = resolveMimeType(file);
      if (!mime) {
        throw new HttpError(400, 'Unable to detect file mime type');
      }

      const upload = await instagramService.uploadMediaSimple({
        teamId,
        file: file.buffer,
        mimeType: mime,
      });

      uploads.push(upload);
      if (upload?.id) {
        uploadIds.push(upload.id);
      }
    }

    const collaborators = parseStringArray(req.body?.collaborators);
    if (collaborators && collaborators.length > MAX_COLLABORATORS) {
      throw new HttpError(
        400,
        `collaborators max is ${MAX_COLLABORATORS}`,
      );
    }

    const tagged = parseTaggedUsers(req.body?.tagged);
    if (tagged && tagged.length > MAX_TAGGED_USERS) {
      throw new HttpError(
        400,
        `tagged max is ${MAX_TAGGED_USERS} users per media`,
      );
    }

    const shareToFeed =
      type === 'REEL' ? coerceBoolean(req.body?.shareToFeed) : undefined;

    const thumbnail = coerceString(req.body?.thumbnail);
    const thumbnailOffset = coerceNumber(req.body?.thumbnailOffset);

    const title = coerceString(req.body?.title);

    const post = await instagramService.createInstagramPost({
      teamId,
      title,
      status,
      postDate,
      text: caption,
      type,
      uploadIds,
      shareToFeed,
      collaborators,
      tagged,
      thumbnail,
      thumbnailOffset,
    });

    res.status(201).json({
      uploads,
      post,
    });
  };

export const publishFeed = publishWithType('POST', 10);
export const publishReel = publishWithType('REEL', 1);
export const publishStory = publishWithType('STORY', 1);

