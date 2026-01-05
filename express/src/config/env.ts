import * as dotenv from 'dotenv';
import {
  InstagramMediaType,
  InstagramPostStatus,
  INSTAGRAM_MEDIA_TYPES,
  INSTAGRAM_POST_STATUSES,
  PORTAL_LANGUAGES,
  PortalLanguage,
} from '../instagram/types';

dotenv.config();

export type TeamTier = 'FREE' | 'PRO' | 'BUSINESS';

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseEnum = <T extends string>(
  value: string | undefined,
  list: readonly T[],
  fallback: T,
) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  const match = list.find((item) => item.toUpperCase() === normalized);
  return match ?? fallback;
};

const parsePortalLanguage = (
  value: string | undefined,
  fallback?: PortalLanguage,
) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return (
    (PORTAL_LANGUAGES.find((lang) => lang === normalized) as PortalLanguage) ??
    fallback
  );
};

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiKey: process.env.BUNDLESOCIAL_API_KEY ?? '',
  webhookSecret: process.env.BUNDLESOCIAL_WEBHOOK_SECRET ?? '',
  redirectUrl:
    process.env.BUNDLESOCIAL_REDIRECT_URL ??
    'http://localhost:3000/instagram/callback',
  defaultTeamName:
    process.env.BUNDLESOCIAL_DEFAULT_TEAM_NAME ?? 'Instagram Demo Team',
  defaultTeamTier: (process.env.BUNDLESOCIAL_DEFAULT_TEAM_TIER ??
    'FREE') as TeamTier,
  portalDefaults: {
    language: parsePortalLanguage(
      process.env.BUNDLESOCIAL_DEFAULT_PORTAL_LANGUAGE,
    ),
    userName: process.env.BUNDLESOCIAL_PORTAL_USER_NAME,
    logoUrl: process.env.BUNDLESOCIAL_PORTAL_LOGO_URL,
    userLogoUrl: process.env.BUNDLESOCIAL_PORTAL_USER_LOGO_URL,
  },
  postDefaults: {
    type: parseEnum<InstagramMediaType>(
      process.env.BUNDLESOCIAL_DEFAULT_POST_TYPE,
      INSTAGRAM_MEDIA_TYPES,
      'POST',
    ),
    status: parseEnum<InstagramPostStatus>(
      process.env.BUNDLESOCIAL_DEFAULT_POST_STATUS,
      INSTAGRAM_POST_STATUSES,
      'SCHEDULED',
    ),
    shareToFeed: parseBoolean(
      process.env.BUNDLESOCIAL_DEFAULT_SHARE_TO_FEED,
      false,
    ),
    scheduleOffsetMinutes: parseNumber(
      process.env.BUNDLESOCIAL_DEFAULT_POST_DELAY_MINUTES,
      0,
    ),
  },
};

if (!env.apiKey) {
  throw new Error('BUNDLESOCIAL_API_KEY is required');
}

if (!env.webhookSecret) {
  throw new Error('BUNDLESOCIAL_WEBHOOK_SECRET is required');
}

export default env;
