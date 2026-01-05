export type InstagramMediaType = 'POST' | 'REEL' | 'STORY';
export const INSTAGRAM_MEDIA_TYPES: InstagramMediaType[] = [
  'POST',
  'REEL',
  'STORY',
];

export type InstagramPostStatus = 'SCHEDULED' | 'DRAFT';
export const INSTAGRAM_POST_STATUSES: InstagramPostStatus[] = [
  'SCHEDULED',
  'DRAFT',
];

export interface InstagramTag {
  username: string;
  x: number;
  y: number;
}

export interface InstagramPostPayload {
  teamId: string;
  title?: string;
  postDate?: string;
  status?: 'SCHEDULED' | 'DRAFT';
  text: string;
  type?: InstagramMediaType;
  uploadIds: string[];
  shareToFeed?: boolean;
  collaborators?: string[];
  tagged?: InstagramTag[];
}

export type PortalLanguage =
  | 'en'
  | 'pl'
  | 'fr'
  | 'hi'
  | 'sv'
  | 'de'
  | 'es'
  | 'it'
  | 'nl'
  | 'pt'
  | 'ru'
  | 'tr'
  | 'zh';
export const PORTAL_LANGUAGES: PortalLanguage[] = [
  'en',
  'pl',
  'fr',
  'hi',
  'sv',
  'de',
  'es',
  'it',
  'nl',
  'pt',
  'ru',
  'tr',
  'zh',
];

export interface PortalLinkPayload {
  teamId: string;
  redirectUrl?: string;
  language?: PortalLanguage;
  userName?: string;
  logoUrl?: string;
  userLogoUrl?: string;
}
