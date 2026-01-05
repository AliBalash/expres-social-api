import { Request, Response } from 'express';
import env from '../../config/env';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';
import { PORTAL_LANGUAGES, PortalLanguage } from '../../instagram/types';

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

type SocialAccountType = (typeof SOCIAL_ACCOUNT_TYPES)[number];

const CHANNEL_SELECTABLE_TYPES = [
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'YOUTUBE',
  'GOOGLE_BUSINESS',
] as const;

type ChannelSelectableType = (typeof CHANNEL_SELECTABLE_TYPES)[number];

const INSTAGRAM_CONNECTION_METHODS = ['FACEBOOK', 'INSTAGRAM'] as const;

type InstagramConnectionMethod =
  (typeof INSTAGRAM_CONNECTION_METHODS)[number];

const REFRESHABLE_TYPES = [
  'DISCORD',
  'SLACK',
  'REDDIT',
  'PINTEREST',
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'YOUTUBE',
  'GOOGLE_BUSINESS',
] as const;

type RefreshableType = (typeof REFRESHABLE_TYPES)[number];

const isChannelSelectable = (
  type: SocialAccountType,
): type is ChannelSelectableType =>
  CHANNEL_SELECTABLE_TYPES.includes(type as ChannelSelectableType);

const isRefreshableType = (
  type: SocialAccountType,
): type is RefreshableType =>
  REFRESHABLE_TYPES.includes(type as RefreshableType);

const requireChannelSelectableType = (
  type: SocialAccountType,
): ChannelSelectableType => {
  if (isChannelSelectable(type)) {
    return type;
  }

  throw new HttpError(
    400,
    `${type} accounts do not support channel selection`,
  );
};

const requireRefreshableType = (
  type: SocialAccountType,
): RefreshableType => {
  if (isRefreshableType(type)) {
    return type;
  }

  throw new HttpError(
    400,
    `${type} accounts do not support refreshing channels`,
  );
};

const parseTeamId = (value: unknown): string => {
  if (Array.isArray(value) && value.length > 0) {
    return parseTeamId(value[0]);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  throw new HttpError(400, 'teamId is required');
};

const normalizeType = (value: unknown): SocialAccountType => {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    const type = SOCIAL_ACCOUNT_TYPES.find((item) => item === upper);
    if (type) {
      return type;
    }
  }

  throw new HttpError(
    400,
    `type must be one of ${SOCIAL_ACCOUNT_TYPES.join(', ')}`,
  );
};

const normalizeTypes = (value: unknown): SocialAccountType[] => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeType(item));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => normalizeType(item));
  }

  return [];
};

const normalizeLanguage = (value: unknown): PortalLanguage | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return PORTAL_LANGUAGES.find(
    (language) => language === normalized,
  ) as PortalLanguage | undefined;
};

const normalizeInstagramMethod = (
  value: unknown,
): InstagramConnectionMethod | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return INSTAGRAM_CONNECTION_METHODS.find(
    (method) => method === normalized,
  ) as InstagramConnectionMethod | undefined;
};

const getTeamSocialAccount = async (teamId: string, socialAccountId: string) => {
  const team = await bundleClient.team.teamGetTeam({ id: teamId });
  const account = team.socialAccounts?.find(
    (item) => item.id === socialAccountId,
  );

  if (!account) {
    throw new HttpError(
      404,
      `No social account ${socialAccountId} found for team ${teamId}`,
    );
  }

  return account;
};

export const createPortalLink = async (req: Request, res: Response) => {
  const {
    teamId,
    redirectUrl,
    socialAccountTypes,
    language,
    logoUrl,
    userLogoUrl,
    userName,
    goBackButtonText,
    hideGoBackButton,
    hideLanguageSwitcher,
    hidePoweredBy,
    hideUserLogo,
    hideUserName,
    maxSocialAccountsConnected,
    showModalOnConnectSuccess,
  } = req.body ?? {};

  const parsedTeamId = parseTeamId(teamId);
  const types = normalizeTypes(socialAccountTypes);

  if (types.length === 0) {
    throw new HttpError(
      400,
      'socialAccountTypes must include at least one platform',
    );
  }

  const payload: Record<string, unknown> = {
    teamId: parsedTeamId,
    redirectUrl: typeof redirectUrl === 'string' ? redirectUrl : env.redirectUrl,
    socialAccountTypes: types,
    language: normalizeLanguage(language) ?? env.portalDefaults.language,
  };

  const resolvedLogoUrl =
    typeof logoUrl === 'string' ? logoUrl : env.portalDefaults.logoUrl;
  if (resolvedLogoUrl) {
    payload.logoUrl = resolvedLogoUrl;
  }

  const resolvedUserLogoUrl =
    typeof userLogoUrl === 'string'
      ? userLogoUrl
      : env.portalDefaults.userLogoUrl;
  if (resolvedUserLogoUrl) {
    payload.userLogoUrl = resolvedUserLogoUrl;
  }

  const resolvedUserName =
    typeof userName === 'string' ? userName : env.portalDefaults.userName;
  if (resolvedUserName) {
    payload.userName = resolvedUserName;
  }

  if (typeof goBackButtonText === 'string') {
    payload.goBackButtonText = goBackButtonText;
  }

  if (typeof hidePoweredBy === 'boolean') {
    payload.hidePoweredBy = hidePoweredBy;
  }

  if (typeof hideGoBackButton === 'boolean') {
    payload.hideGoBackButton = hideGoBackButton;
  }

  if (typeof hideUserLogo === 'boolean') {
    payload.hideUserLogo = hideUserLogo;
  }

  if (typeof hideUserName === 'boolean') {
    payload.hideUserName = hideUserName;
  }

  if (typeof hideLanguageSwitcher === 'boolean') {
    payload.hideLanguageSwitcher = hideLanguageSwitcher;
  }

  if (typeof showModalOnConnectSuccess === 'boolean') {
    payload.showModalOnConnectSuccess = showModalOnConnectSuccess;
  }

  if (typeof maxSocialAccountsConnected === 'number') {
    payload.maxSocialAccountsConnected = maxSocialAccountsConnected;
  }

  const portalLink =
    await bundleClient.socialAccount.socialAccountCreatePortalLink({
      requestBody: payload as never,
    });

  res.status(201).json(portalLink);
};

export const connectSocialAccount = async (req: Request, res: Response) => {
  const { teamId, type, redirectUrl, serverUrl, instagramConnectionMethod } =
    req.body ?? {};

  if (typeof redirectUrl !== 'string' || redirectUrl.trim().length === 0) {
    throw new HttpError(400, 'redirectUrl is required');
  }

  const connection =
    await bundleClient.socialAccount.socialAccountConnect({
      requestBody: {
        teamId: parseTeamId(teamId),
        type: normalizeType(type),
        redirectUrl: redirectUrl.trim(),
        serverUrl:
          typeof serverUrl === 'string' && serverUrl.trim()
            ? serverUrl.trim()
            : undefined,
        instagramConnectionMethod: normalizeInstagramMethod(
          instagramConnectionMethod,
        ),
      },
    });

  res.status(201).json(connection);
};

export const getSocialAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teamId = parseTeamId(req.query.teamId);

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const account = await getTeamSocialAccount(teamId, id);
  res.json(account);
};

export const updateSocialAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { channelId, refreshChannels } = req.body ?? {};
  const teamId = parseTeamId(req.body?.teamId ?? req.query.teamId);

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  if (!channelId && !refreshChannels) {
    throw new HttpError(
      400,
      'Provide channelId or set refreshChannels to true to update the social account',
    );
  }

  const account = await getTeamSocialAccount(teamId, id);
  const accountType = account.type as SocialAccountType;
  let responsePayload = account;

  if (channelId) {
    const channelType = requireChannelSelectableType(accountType);
    responsePayload =
      await bundleClient.socialAccount.socialAccountSetChannel({
        requestBody: {
          teamId,
          channelId,
          type: channelType,
        },
      });
  }

  if (refreshChannels) {
    const refreshType = requireRefreshableType(accountType);
    responsePayload =
      await bundleClient.socialAccount.socialAccountRefreshChannels({
        requestBody: {
          teamId,
          type: refreshType,
        },
      });
  }

  res.json(responsePayload);
};

export const deleteSocialAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teamId = parseTeamId(req.body?.teamId ?? req.query.teamId);

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const account = await getTeamSocialAccount(teamId, id);

  const deleted =
    await bundleClient.socialAccount.socialAccountDisconnect({
      requestBody: {
        teamId,
        type: account.type as SocialAccountType,
      },
    });

  res.json(deleted);
};
