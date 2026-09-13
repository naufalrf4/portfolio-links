import type { ProfileLink, SocialLink } from '../types';

export type SupportedSocialPlatform =
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'email';

function normalizeComparableUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function getUrlMetadata(rawUrl: string): { normalizedUrl: string; host: string } | null {
  const normalizedUrl = normalizeComparableUrl(rawUrl);

  if (!normalizedUrl) {
    return null;
  }

  if (normalizedUrl.startsWith('mailto:')) {
    return { normalizedUrl, host: 'mailto' };
  }

  try {
    const url = new URL(normalizedUrl);
    return { normalizedUrl, host: url.hostname.replace(/^www\./, '') };
  } catch {
    return null;
  }
}

function containsKeyword(haystack: string, keyword: string): boolean {
  return (
    haystack === keyword || haystack.includes(`${keyword} `) || haystack.includes(` ${keyword}`)
  );
}

function getLinkTokens(link: {
  platform?: string | null;
  label?: string | null;
  icon?: string | null;
  url: string;
}): string {
  return [link.platform, link.label, link.icon, getUrlMetadata(link.url)?.normalizedUrl]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

export function detectSocialPlatform(
  link: Pick<ProfileLink, 'label' | 'icon' | 'url'> | SocialLink
): SupportedSocialPlatform | null {
  const urlMetadata = getUrlMetadata(link.url);
  const host = urlMetadata?.host ?? '';
  const tokens = getLinkTokens(link);

  if (host === 'mailto' || containsKeyword(tokens, 'email') || containsKeyword(tokens, 'mail')) {
    return 'email';
  }

  if (host === 'github.com' || tokens.includes('github')) {
    return 'github';
  }

  if (host === 'linkedin.com' || host.endsWith('.linkedin.com') || tokens.includes('linkedin')) {
    return 'linkedin';
  }

  if (
    host === 'twitter.com' ||
    host === 'x.com' ||
    host.endsWith('.x.com') ||
    tokens.includes('twitter') ||
    containsKeyword(tokens, 'x')
  ) {
    return 'twitter';
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com') || tokens.includes('instagram')) {
    return 'instagram';
  }

  if (host === 'youtube.com' || host === 'youtu.be' || tokens.includes('youtube')) {
    return 'youtube';
  }

  return null;
}

export function normalizeUrl(url: string): string {
  const metadata = getUrlMetadata(url);
  return metadata?.normalizedUrl ?? normalizeComparableUrl(url);
}

export function isSocialProfileLink(link: ProfileLink): boolean {
  return detectSocialPlatform(link) !== null;
}

export function getWebsiteLinkKind(
  link: ProfileLink
): 'briefcase' | 'book-open' | 'file-text' | 'code' | 'globe' {
  const label = link.label.toLowerCase();
  const icon = link.icon?.toLowerCase() || '';
  const combined = `${label} ${icon}`;

  if (combined.includes('portfolio')) return 'briefcase';
  if (combined.includes('blog')) return 'book-open';
  if (combined.includes('resume') || combined.includes('cv')) return 'file-text';
  if (combined.includes('project') || combined.includes('code')) return 'code';
  return 'globe';
}
