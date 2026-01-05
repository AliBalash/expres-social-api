import { Request, Response } from 'express';
import HttpError from '../errors/HttpError';
import instagramService from './service';
import {
  InstagramMediaType,
  InstagramPostPayload,
  PortalLanguage,
  INSTAGRAM_MEDIA_TYPES,
  PORTAL_LANGUAGES,
} from './types';

const parsePortalLanguage = (value: unknown): PortalLanguage | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return PORTAL_LANGUAGES.find((lang) => lang === value);
};

const normalizeBasePostPayload = (
  body: Partial<InstagramPostPayload>,
  defaultType: InstagramMediaType,
  allowCustomType = false,
): InstagramPostPayload => {
  if (!body.teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  if (!body.text) {
    throw new HttpError(400, 'text is required');
  }

  if (!Array.isArray(body.uploadIds) || body.uploadIds.length === 0) {
    throw new HttpError(400, 'At least one uploadId is required');
  }

  const sanitizedUploadIds = body.uploadIds.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );

  if (sanitizedUploadIds.length === 0) {
    throw new HttpError(400, 'uploadIds must contain valid values');
  }

  let type: InstagramMediaType = defaultType;

  if (allowCustomType && body.type && typeof body.type === 'string') {
    const upper = body.type.toUpperCase() as InstagramMediaType;
    if (INSTAGRAM_MEDIA_TYPES.includes(upper)) {
      type = upper;
    } else {
      throw new HttpError(
        400,
        'type must be one of POST, REEL or STORY when provided',
      );
    }
  }

  return {
    teamId: body.teamId,
    title: body.title,
    postDate: body.postDate,
    status: body.status,
    text: body.text,
    type,
    uploadIds: sanitizedUploadIds,
    shareToFeed: body.shareToFeed,
    collaborators: body.collaborators,
    tagged: body.tagged,
  };
};

export const healthCheck = async (_req: Request, res: Response) => {
  const health = await instagramService.getHealth();
  res.json(health);
};

export const organizationDetails = async (_req: Request, res: Response) => {
  const organization = await instagramService.getOrganization();
  res.json(organization);
};

export const createTeam = async (req: Request, res: Response) => {
  const { name, tier } = req.body;

  const team = await instagramService.createTeam(name, tier);
  res.status(201).json(team);
};

export const getTeam = async (req: Request, res: Response) => {
  const { teamId } = req.params;

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const team = await instagramService.getTeam(teamId);
  res.json(team);
};

export const createPortalLink = async (req: Request, res: Response) => {
  const { teamId, redirectUrl, userName, language, logoUrl, userLogoUrl } =
    req.body;

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  const portalLink = await instagramService.createPortalLink({
    teamId,
    redirectUrl,
    userName,
    language: parsePortalLanguage(language),
    logoUrl,
    userLogoUrl,
  });

  res.status(201).json(portalLink);
};

export const setChannel = async (req: Request, res: Response) => {
  const { teamId, channelId } = req.body;

  if (!teamId || !channelId) {
    throw new HttpError(400, 'teamId and channelId are required');
  }

  const response = await instagramService.setInstagramChannel(teamId, channelId);
  res.json(response);
};

export const uploadMedia = async (req: Request, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) {
    throw new HttpError(400, 'teamId is required');
  }

  if (!req.file) {
    throw new HttpError(400, 'file is required');
  }

  const upload = await instagramService.uploadMediaSimple({
    teamId,
    file: req.file.buffer,
    mimeType: req.file.mimetype,
  });

  res.status(201).json(upload);
};

const publishWithType =
  (
    fallbackType: InstagramMediaType,
    allowCustomType = false,
  ) =>
  async (req: Request, res: Response) => {
    const payload = normalizeBasePostPayload(
      req.body as Partial<InstagramPostPayload>,
      fallbackType,
      allowCustomType,
    );

    const post = await instagramService.createInstagramPost(payload);
    res.status(201).json(post);
  };

export const createInstagramPost = publishWithType('POST', true);
export const createFeedPost = publishWithType('POST');
export const createReelPost = publishWithType('REEL');
export const createStoryPost = publishWithType('STORY');

export const getPostStatus = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId) {
    throw new HttpError(400, 'postId is required');
  }

  const post = await instagramService.getPost(postId);
  res.json(post);
};

export const retryPost = async (req: Request, res: Response) => {
  const { postId } = req.params;

  if (!postId) {
    throw new HttpError(400, 'postId is required');
  }

  const response = await instagramService.retryPost(postId);
  res.json(response);
};
