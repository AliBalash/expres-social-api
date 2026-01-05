import { Request, Response } from 'express';

const SOCIAL_ACCOUNT_TYPES = [
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

const loadTimeZones = (): string[] => {
  const intl = Intl as unknown as {
    supportedValuesOf?: (field: string) => string[];
  };

  if (typeof intl.supportedValuesOf === 'function') {
    try {
      return intl.supportedValuesOf('timeZone');
    } catch {
      // fall through to fallback list
    }
  }

  return [
    'UTC',
    'Europe/London',
    'Europe/Paris',
    'Europe/Rome',
    'Europe/Warsaw',
    'Asia/Tehran',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney',
    'America/New_York',
    'America/Los_Angeles',
    'America/Sao_Paulo',
  ];
};

const timeZones = loadTimeZones();

export const getTimeZones = async (_req: Request, res: Response) => {
  res.json({
    count: timeZones.length,
    items: timeZones,
  });
};

export const getPlatforms = async (_req: Request, res: Response) => {
  res.json({
    socialAccountTypes: SOCIAL_ACCOUNT_TYPES,
    analyticsPlatforms: ANALYTICS_PLATFORMS,
    commentPlatforms: COMMENT_PLATFORMS,
  });
};

export const getServerInfo = async (_req: Request, res: Response) => {
  res.json({
    now: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    pid: process.pid,
  });
};
