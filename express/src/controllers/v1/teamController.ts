import { Request, Response } from 'express';
import env, { TeamTier } from '../../config/env';
import HttpError from '../../errors/HttpError';
import bundleClient from '../../services/bundleSocialClient';

const TEAM_TIERS: TeamTier[] = ['FREE', 'PRO', 'BUSINESS'];

const parseNumberParam = (value: unknown): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return parseNumberParam(value[0]);
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeTier = (value: unknown): TeamTier => {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (TEAM_TIERS.includes(upper as TeamTier)) {
      return upper as TeamTier;
    }
  }

  return env.defaultTeamTier;
};

export const listTeams = async (req: Request, res: Response) => {
  const limit = parseNumberParam(req.query.limit);
  const offset = parseNumberParam(req.query.offset);

  const teams = await bundleClient.team.teamGetList({
    limit,
    offset,
  });

  res.json(teams);
};

export const createTeam = async (req: Request, res: Response) => {
  const { name, tier, avatarUrl, copyTeamId } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new HttpError(400, 'name is required');
  }

  const payload: Record<string, unknown> = {
    name: name.trim(),
  };

  if (avatarUrl) {
    payload.avatarUrl = avatarUrl;
  }

  if (copyTeamId) {
    payload.copyTeamId = copyTeamId;
  }

  payload.tier = normalizeTier(tier);

  const team = await bundleClient.team.teamCreateTeam({
    requestBody: payload as never,
  });

  res.status(201).json(team);
};

export const getTeam = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const team = await bundleClient.team.teamGetTeam({ id });
  res.json(team);
};

export const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, avatarUrl } = req.body ?? {};

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  if (!name && !avatarUrl) {
    throw new HttpError(400, 'Provide name or avatarUrl to update the team');
  }

  const payload: Record<string, unknown> = {};
  if (typeof name === 'string' && name.trim()) {
    payload.name = name.trim();
  }
  if (avatarUrl) {
    payload.avatarUrl = avatarUrl;
  }

  const team = await bundleClient.team.teamUpdateTeam({
    id,
    requestBody: payload,
  });

  res.json(team);
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new HttpError(400, 'id is required');
  }

  const team = await bundleClient.team.teamDeleteTeam({ id });
  res.json(team);
};
