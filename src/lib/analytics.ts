import { buildProxyHeaders } from '@naufalrf/http';

export function buildAnalyticsProxyHeaders({
  request,
  sourcePath,
  timezone,
  clientAddress,
}: {
  request: Request;
  sourcePath: string;
  timezone?: string;
  clientAddress?: string;
}): Headers {
  return buildProxyHeaders('links-astro', sourcePath, request.headers, timezone, clientAddress);
}
