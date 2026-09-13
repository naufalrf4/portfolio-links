import type { AboutData as AdminAboutData, ProfileLink } from '@naufalrf/contracts';

export type { ProfileLink } from '@naufalrf/contracts';

export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
  icon?: string;
}

export interface AboutData {
  fullName: string;
  tagline: string | null;
  shortBio?: string | null;
  bio: string | null;
  avatarUrl: string | null;
  socialLinks: SocialLink[];
}

export type AdminAbout = AdminAboutData;
export type AdminProfileLink = ProfileLink;
