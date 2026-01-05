import { Request, Response } from 'express';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const COMMENT_PLATFORMS = [
  'TIKTOK',
  'YOUTUBE',
  'INSTAGRAM',
  'FACEBOOK',
  'THREADS',
  'LINKEDIN',
  'REDDIT',
  'MASTODON',
  'DISCORD',
  'SLACK',
  'BLUESKY',
] as const;

const COMMENT_ORDER_FIELDS = ['createdAt', 'updatedAt', 'deletedAt'] as const;

const COMMENT_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'POSTED',
  'ERROR',
  'DELETED',
  'PROCESSING',
  'RETRYING',
] as const;

type CommentPlatform = (typeof COMMENT_PLATFORMS)[number];
type CommentOrderField = (typeof COMMENT_ORDER_FIELDS)[number];
type CommentStatus = (typeof COMMENT_STATUSES)[number];

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

const parseEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return allowed.find((item) => item === normalized) as T | undefined;
};

const parsePlatforms = (value: unknown): CommentPlatform[] | undefined => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : undefined;

  if (!source) {
    return undefined;
  }

  const normalized = source
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter(Boolean);

  if (!normalized.length) {
    return undefined;
  }

  return normalized.filter((item): item is CommentPlatform =>
    (COMMENT_PLATFORMS as readonly string[]).includes(item),
  );
};

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const createComment = async (req: Request, res: Response) => {
  const comment = await bundleClient.comment.commentCreate({
    requestBody: req.body,
  });

  res.status(201).json(comment);
};

export const listComments = async (req: Request, res: Response) => {
  const teamId = coerceString(req.query.teamId);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const comments = await bundleClient.comment.commentGetList({
    teamId,
    postId: coerceString(req.query.postId),
    q: coerceString(req.query.q),
    limit: parseNumberParam(req.query.limit),
    offset: parseNumberParam(req.query.offset),
    order: parseEnum<'ASC' | 'DESC'>(req.query.order, ['ASC', 'DESC']),
    orderBy: parseEnum<CommentOrderField>(
      req.query.orderBy,
      COMMENT_ORDER_FIELDS,
    ),
    status: parseEnum<CommentStatus>(req.query.status, COMMENT_STATUSES),
    platforms: parsePlatforms(req.query.platforms),
  });

  res.json(comments);
};

export const getComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const comment = await bundleClient.comment.commentGet({ id });
  res.json(comment);
};

export const updateComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const comment = await bundleClient.comment.commentUpdate({
    id,
    requestBody: req.body,
  });

  res.json(comment);
};

export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const comment = await bundleClient.comment.commentDelete({ id });
  res.json(comment);
};
