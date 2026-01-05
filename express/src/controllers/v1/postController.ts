import { Request, Response } from 'express';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const ORDER_FIELDS = [
  'createdAt',
  'updatedAt',
  'postDate',
  'postedDate',
  'deletedAt',
] as const;

const ORDER_DIRECTIONS = ['ASC', 'DESC'] as const;

const POST_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'POSTED',
  'ERROR',
  'DELETED',
  'PROCESSING',
  'REVIEW',
  'RETRYING',
] as const;

const PLATFORMS = [
  'TIKTOK',
  'YOUTUBE',
  'INSTAGRAM',
  'FACEBOOK',
  'TWITTER',
  'THREADS',
  'LINKEDIN',
  'PINTEREST',
  'REDDIT',
  'MASTODON',
  'DISCORD',
  'SLACK',
  'BLUESKY',
  'GOOGLE_BUSINESS',
] as const;

type OrderField = (typeof ORDER_FIELDS)[number];
type OrderDirection = (typeof ORDER_DIRECTIONS)[number];
type PostStatus = (typeof POST_STATUSES)[number];
type PlatformType = (typeof PLATFORMS)[number];

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

const parsePlatforms = (value: unknown): PlatformType[] | undefined => {
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

  return normalized.filter((item): item is PlatformType =>
    (PLATFORMS as readonly string[]).includes(item),
  );
};

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const listPosts = async (req: Request, res: Response) => {
  const teamId = coerceString(req.query.teamId);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const posts = await bundleClient.post.postGetList({
    teamId,
    limit: parseNumberParam(req.query.limit),
    offset: parseNumberParam(req.query.offset),
    q: coerceString(req.query.q),
    order: parseEnum<OrderDirection>(req.query.order, ORDER_DIRECTIONS),
    orderBy: parseEnum<OrderField>(req.query.orderBy, ORDER_FIELDS),
    status: parseEnum<PostStatus>(req.query.status, POST_STATUSES),
    platforms: parsePlatforms(req.query.platforms),
  });

  res.json(posts);
};

export const createPost = async (req: Request, res: Response) => {
  const post = await bundleClient.post.postCreate({
    requestBody: req.body,
  });

  res.status(201).json(post);
};

export const getPost = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const post = await bundleClient.post.postGet({ id });
  res.json(post);
};

export const updatePost = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const post = await bundleClient.post.postUpdate({
    id,
    requestBody: req.body,
  });

  res.json(post);
};

export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const post = await bundleClient.post.postDelete({ id });
  res.json(post);
};

export const retryPost = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const post = await bundleClient.post.postRetry({ id });
  res.json(post);
};
