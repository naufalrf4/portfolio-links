import type { AboutData, ProfileLink } from '../types';
import type { AboutData as AdminAboutData } from '@naufalrf/contracts';
import { createAbortSignal, createLogger, createLogShipper, HttpError, isAbortError, isSuccessEnvelope } from '@naufalrf/http';
import type { LogEntryInput } from '@naufalrf/contracts';

const API_BASE =
  process.env.ADMIN_API_URL?.trim() || import.meta.env.ADMIN_API_URL?.trim() || 'http://localhost:3001';
const API_TIMEOUT_MS = 5000;

const ADMIN_INTERNAL_API_TOKEN =
  process.env.ADMIN_INTERNAL_API_TOKEN?.trim() ||
  import.meta.env.ADMIN_INTERNAL_API_TOKEN?.trim() ||
  process.env.ADMIN_SERVICE_TOKEN?.trim() ||
  import.meta.env.ADMIN_SERVICE_TOKEN?.trim() ||
  '';

function createLinksApiSink(): ((entry: LogEntryInput) => void) | undefined {
  if (!ADMIN_INTERNAL_API_TOKEN) return undefined;
  const shipper = createLogShipper({
    endpoint: `${API_BASE}/api/v1/internal/logs`,
    token: ADMIN_INTERNAL_API_TOKEN,
  });
  return (entry) => shipper.enqueue(entry);
}

export const logger = createLogger({
  service: 'links-astro',
  sink: createLinksApiSink(),
});

interface LinksPageData {
  aboutData: AboutData;
  links: ProfileLink[];
}

async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const { signal, cleanup } = createAbortSignal(API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { headers, signal });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const json: unknown = await response.json();

    if (isSuccessEnvelope<T>(json)) return json.data;

    return json as T;
  } catch (error) {
    if (isAbortError(error)) {
      const timeoutError = new HttpError(`Admin API request timed out for ${endpoint}`, error);
      timeoutError.name = 'LinksApiError';
      throw timeoutError;
    }

    throw error;
  } finally {
    cleanup();
  }
}

export async function getProfileLinks(): Promise<ProfileLink[]> {
  const links = await apiFetch<ProfileLink[]>('/api/v1/public/links');
  return Array.isArray(links) ? links : [];
}

export async function getAboutData(): Promise<AboutData> {
  const aboutData = await apiFetch<AdminAboutData>('/api/v1/public/about');

  return {
    fullName: aboutData?.fullName || 'NaufalRF',
    tagline: aboutData?.tagline || 'Full-Stack Engineer',
    shortBio: aboutData?.shortBio || null,
    bio:
      aboutData?.shortBio ||
      aboutData?.bio ||
      'Building scalable web applications. Open to collaboration and opportunities.',
    avatarUrl: aboutData?.avatarUrl || null,
    socialLinks: Array.isArray(aboutData?.socialLinks)
      ? aboutData.socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
          label: link.platform,
          icon: link.platform,
        }))
      : [],
  };
}

export async function getLinksPageData(): Promise<LinksPageData> {
  const [aboutData, links] = await Promise.all([getAboutData(), getProfileLinks()]);

  return {
    aboutData,
    links: links.sort((firstLink, secondLink) => firstLink.order - secondLink.order),
  };
}
