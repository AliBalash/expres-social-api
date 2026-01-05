import { Blob } from 'buffer';
import env, { TeamTier } from '../config/env';
import { InstagramPostPayload, PortalLinkPayload } from './types';
import bundleClient from '../services/bundleSocialClient';

export class InstagramService {
  private client = bundleClient;

  getHealth() {
    return this.client.app.appGetHealth();
  }

  getOrganization() {
    return this.client.organization.organizationGetOrganization();
  }

  createTeam(name?: string, tier?: TeamTier) {
    const requestBody: Record<string, unknown> = {
      name: name ?? env.defaultTeamName,
    };

    requestBody.tier = tier ?? env.defaultTeamTier;

    return this.client.team.teamCreateTeam({
      requestBody: requestBody as never,
    });
  }

  getTeam(teamId: string) {
    return this.client.team.teamGetTeam({ id: teamId });
  }

  createPortalLink(payload: PortalLinkPayload) {
    return this.client.socialAccount.socialAccountCreatePortalLink({
      requestBody: {
        teamId: payload.teamId,
        redirectUrl: payload.redirectUrl ?? env.redirectUrl,
        userName: payload.userName ?? env.portalDefaults.userName,
        logoUrl: payload.logoUrl ?? env.portalDefaults.logoUrl,
        userLogoUrl: payload.userLogoUrl ?? env.portalDefaults.userLogoUrl,
        language: payload.language ?? env.portalDefaults.language,
        socialAccountTypes: ['INSTAGRAM'],
      },
    });
  }

  setInstagramChannel(teamId: string, channelId: string) {
    return this.client.socialAccount.socialAccountSetChannel({
      requestBody: {
        teamId,
        channelId,
        type: 'INSTAGRAM',
      },
    });
  }

  uploadMediaSimple(params: {
    teamId: string;
    file: Buffer;
    mimeType: string;
  }) {
    const blob = new Blob([params.file], { type: params.mimeType });

    return this.client.upload.uploadCreate({
      formData: {
        teamId: params.teamId,
        file: blob,
      },
    });
  }

  createInstagramPost(payload: InstagramPostPayload) {
    const offsetMs = env.postDefaults.scheduleOffsetMinutes * 60 * 1000;

    return this.client.post.postCreate({
      requestBody: {
        teamId: payload.teamId,
        title: payload.title ?? 'Instagram Post',
        status: payload.status ?? env.postDefaults.status,
        postDate:
          payload.postDate ?? new Date(Date.now() + offsetMs).toISOString(),
        socialAccountTypes: ['INSTAGRAM'],
        data: {
          INSTAGRAM: {
            type: payload.type ?? env.postDefaults.type,
            text: payload.text,
            uploadIds: payload.uploadIds,
            shareToFeed:
              payload.shareToFeed ?? env.postDefaults.shareToFeed,
            collaborators: payload.collaborators,
            tagged: payload.tagged,
          },
        },
      },
    });
  }

  getPost(postId: string) {
    return this.client.post.postGet({ id: postId });
  }

  retryPost(postId: string) {
    return this.client.post.postRetry({ id: postId });
  }
}

const instagramService = new InstagramService();

export default instagramService;
