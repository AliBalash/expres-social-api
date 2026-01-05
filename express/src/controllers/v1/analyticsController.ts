import { Request, Response } from 'express';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const ANALYTICS_PLATFORMS = [
  'TIKTOK',
  'YOUTUBE',
  'INSTAGRAM',
  'FACEBOOK',
  'THREADS',
  'REDDIT',
  'PINTEREST',
  'MASTODON',
  'LINKEDIN',
  'BLUESKY',
  'GOOGLE_BUSINESS',
] as const;

type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

const ensureAnalyticsPlatform = (value: unknown): AnalyticsPlatform => {
  if (Array.isArray(value) && value.length > 0) {
    return ensureAnalyticsPlatform(value[0]);
  }

  if (typeof value !== 'string') {
    throw new HttpError(
      400,
      `platformType must be one of ${ANALYTICS_PLATFORMS.join(', ')}`,
    );
  }

  const upper = value.trim().toUpperCase();
  const platform = ANALYTICS_PLATFORMS.find((item) => item === upper);

  if (!platform) {
    throw new HttpError(
      400,
      `platformType must be one of ${ANALYTICS_PLATFORMS.join(', ')}`,
    );
  }

  return platform;
};

const coerceString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return coerceString(value[0]);
  }

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const aggregateEntries = (
  items: Array<{
    impressions: number;
    impressionsUnique: number;
    views: number;
    viewsUnique: number;
    likes: number;
    comments: number;
    postCount: number;
    followers: number;
    following: number;
  }>,
) => {
  return items.reduce(
    (acc, item) => ({
      impressions: acc.impressions + (item.impressions ?? 0),
      impressionsUnique: acc.impressionsUnique + (item.impressionsUnique ?? 0),
      views: acc.views + (item.views ?? 0),
      viewsUnique: acc.viewsUnique + (item.viewsUnique ?? 0),
      likes: acc.likes + (item.likes ?? 0),
      comments: acc.comments + (item.comments ?? 0),
      postCount: acc.postCount + (item.postCount ?? 0),
      followers: acc.followers + (item.followers ?? 0),
      following: acc.following + (item.following ?? 0),
    }),
    {
      impressions: 0,
      impressionsUnique: 0,
      views: 0,
      viewsUnique: 0,
      likes: 0,
      comments: 0,
      postCount: 0,
      followers: 0,
      following: 0,
    },
  );
};

export const getTeamAnalytics = async (req: Request, res: Response) => {
  const { teamId } = req.params;

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const team = await bundleClient.team.teamGetTeam({ id: teamId });
  const socialAccounts = team.socialAccounts ?? [];

  const platforms = socialAccounts
    .map((account) => account.type)
    .filter(
      (type): type is AnalyticsPlatform =>
        (ANALYTICS_PLATFORMS as readonly string[]).includes(type as string),
    );

  const uniquePlatforms = platforms.filter(
    (platform, index) => platforms.indexOf(platform) === index,
  );

  if (uniquePlatforms.length === 0) {
    throw new HttpError(
      404,
      'Team does not have analytics-enabled social accounts',
    );
  }

  const analytics = await Promise.all(
    uniquePlatforms.map(async (platformType) => {
      const response =
        await bundleClient.analytics.analyticsGetSocialAccountAnalytics({
          teamId,
          platformType,
        });

      return {
        platformType,
        socialAccount: response.socialAccount,
        totals: aggregateEntries(response.items),
        entries: response.items,
      };
    }),
  );

  res.json({
    teamId,
    analytics,
  });
};

export const getSocialAccountAnalytics = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const teamId = coerceString(req.query.teamId);

  if (!id) {
    throw new HttpError(400, 'id is required');
  }
  if (!teamId) {
    throw new HttpError(400, 'teamId query parameter is required');
  }

  const team = await bundleClient.team.teamGetTeam({ id: teamId });
  const account = team.socialAccounts?.find((item) => item.id === id);

  if (!account) {
    throw new HttpError(
      404,
      `No social account ${id} found for team ${teamId}`,
    );
  }

  const platformType = ensureAnalyticsPlatform(account.type);

  const analytics =
    await bundleClient.analytics.analyticsGetSocialAccountAnalytics({
      teamId,
      platformType,
    });

  res.json(analytics);
};

const detectPostPlatforms = (postData: Record<string, unknown>) => {
  return ANALYTICS_PLATFORMS.filter((platform) => Boolean(postData[platform]));
};

export const getPostAnalytics = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const requestedPlatformType = req.query.platformType
    ? ensureAnalyticsPlatform(req.query.platformType)
    : undefined;

  if (!postId) {
    throw new HttpError(400, 'postId is required');
  }

  let platforms: AnalyticsPlatform[] = [];

  if (requestedPlatformType) {
    platforms = [requestedPlatformType];
  } else {
    const post = await bundleClient.post.postGet({ id: postId });
    const data = post.data as Record<string, unknown>;
    platforms = detectPostPlatforms(data);
  }

  if (platforms.length === 0) {
    throw new HttpError(
      404,
      'Post does not include analytics-enabled platforms',
    );
  }

  const analytics = await Promise.all(
    platforms.map((platformType) =>
      bundleClient.analytics.analyticsGetPostAnalytics({
        postId,
        platformType,
      }),
    ),
  );

  res.json({
    postId,
    analytics,
  });
};

export const forceTeamAnalyticsRefresh = async (
  req: Request,
  res: Response,
) => {
  const { teamId } = req.params;
  const platformType = ensureAnalyticsPlatform(req.body?.platformType);

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const result =
    await bundleClient.analytics.analyticsForceSocialAccountAnalytics({
      requestBody: {
        teamId,
        platformType,
      },
    });

  res.json(result);
};

export const forcePostAnalyticsRefresh = async (
  req: Request,
  res: Response,
) => {
  const { postId } = req.params;
  const platformType = ensureAnalyticsPlatform(req.body?.platformType);

  if (!postId) {
    throw new HttpError(400, 'postId is required');
  }

  const result = await bundleClient.analytics.analyticsForcePostAnalytics({
    requestBody: {
      postId,
      platformType,
    },
  });

  res.json(result);
};
