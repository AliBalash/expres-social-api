import { Request, Response } from 'express';
import env from '../config/env';
import HttpError from '../errors/HttpError';
import bundleClient from '../services/bundleSocialClient';

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

type PostStatus = (typeof POST_STATUSES)[number];

const countPosts = async (teamId: string, status: PostStatus) => {
  const list = await bundleClient.post.postGetList({
    teamId,
    status,
    limit: 1,
    offset: 0,
  });

  return list.total ?? 0;
};

export const getInstagramUsage = async (_req: Request, res: Response) => {
  const teamId = env.defaultTeamId;

  if (!teamId) {
    throw new HttpError(
      500,
      'BUNDLESOCIAL_DEFAULT_TEAM_ID is not set in the server env',
    );
  }

  const [postsUsage, uploadsUsage] = await Promise.all([
    bundleClient.organization.organizationGetPostsUsage(),
    bundleClient.organization.organizationGetUploadsUsage(),
  ]);

  const totals = await Promise.all(
    POST_STATUSES.map(async (status) => [status, await countPosts(teamId, status)]),
  );

  const postTotalsByStatus = Object.fromEntries(totals) as Record<
    PostStatus,
    number
  >;

  const unusedUploads = await bundleClient.upload.uploadGetList({
    teamId,
    status: 'UNUSED',
  });

  res.json({
    teamId,
    postsUsage,
    uploadsUsage,
    postTotalsByStatus,
    unusedUploadsCount: unusedUploads.length,
    unusedUploads: unusedUploads.slice(0, 20).map((upload) => ({
      id: upload.id,
      type: upload.type,
      mime: upload.mime,
      fileSize: upload.fileSize,
      createdAt: upload.createdAt,
    })),
  });
};

