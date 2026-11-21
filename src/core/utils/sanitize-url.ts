import { mErrorCode } from '@/core/errors/codes';
import type { Result } from '@/core/errors/result';
import { createErrorResponse, ok } from '@/core/errors/result';

const mAllowedProtocols: ReadonlySet<string> = new Set(['https:', 'http:', 'blob:']);
const mAllowedImageDataUrl = /^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/i;

/** Returns a normalized URL when its scheme is allowed for images and links, else INVALID_URL. */
export function sanitizeUrl(input: string): Result<string> {
  const trimmed = input.trim();

  if (mAllowedImageDataUrl.test(trimmed)) {
    return ok(trimmed);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return createErrorResponse(mErrorCode.InvalidUrl, 'URL is not valid');
  }

  if (!mAllowedProtocols.has(url.protocol)) {
    return createErrorResponse(
      mErrorCode.InvalidUrl,
      `URL protocol "${url.protocol}" is not allowed`,
    );
  }

  return ok(url.href);
}
