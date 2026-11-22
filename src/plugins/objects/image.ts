import { FabricImage } from 'fabric';

import { mAllowedImageTypes, mImageFitRatio, mMaxImageBytes } from '@/constants/objects';
import { createErrorResponse, mErrorCode, ok, type Editor, type Result } from '@/core';

import { placeOnArtboard } from '@/plugins/objects/place';

const mAllowedTypes: readonly string[] = mAllowedImageTypes;
const mProbeTimeoutMs = 10_000;

export async function insertImageFromUrl(editor: Editor, href: string): Promise<Result<string>> {
  const loaded = await loadImage(href);
  if (!loaded.success) return loaded;
  return placeFittedImage(editor, loaded.data);
}

export async function insertImageFromFile(
  editor: Editor,
  file: File,
  maxBytes: number = mMaxImageBytes,
): Promise<Result<string>> {
  if (!mAllowedTypes.includes(file.type)) {
    return createErrorResponse(
      mErrorCode.FileTypeUnsupported,
      `Unsupported file type "${file.type}"`,
    );
  }
  if (file.size > maxBytes) {
    return createErrorResponse(
      mErrorCode.FileTooLarge,
      `Image exceeds ${maxBytes.toString()} bytes`,
    );
  }
  let dataUrl: string;
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch (error: unknown) {
    console.error('[kanvaskit] failed to read image file', error);
    return createErrorResponse(mErrorCode.ImageLoadFailed, 'Could not read the image file');
  }
  return insertImageFromUrl(editor, dataUrl);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader returned a non-string result'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed'));
    };
    reader.readAsDataURL(file);
  });
}

async function loadImage(href: string): Promise<Result<FabricImage>> {
  try {
    const image = await FabricImage.fromURL(href, { crossOrigin: 'anonymous' });
    return ok(image);
  } catch (error: unknown) {
    console.error('[kanvaskit] image load failed', error);
  }
  if (isLocalUrl(href)) {
    return createErrorResponse(mErrorCode.ImageLoadFailed, 'Image could not be loaded');
  }
  const reachable = await canLoadWithoutCors(href);
  if (reachable) {
    return createErrorResponse(
      mErrorCode.ImageCorsBlocked,
      'Image host does not allow cross-origin use',
    );
  }
  return createErrorResponse(mErrorCode.ImageLoadFailed, 'Image could not be loaded');
}

function isLocalUrl(href: string): boolean {
  return href.startsWith('data:') || href.startsWith('blob:');
}

/** Probes whether the image loads as a plain, non-CORS request, to tell CORS blocks from dead links. */
function canLoadWithoutCors(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image();
    const finish = (value: boolean): void => {
      window.clearTimeout(timer);
      probe.onload = null;
      probe.onerror = null;
      resolve(value);
    };
    const timer = window.setTimeout(() => {
      finish(false);
    }, mProbeTimeoutMs);
    probe.onload = () => {
      finish(true);
    };
    probe.onerror = () => {
      finish(false);
    };
    probe.src = href;
  });
}

function placeFittedImage(editor: Editor, image: FabricImage): Result<string> {
  if (editor.isDisposed) {
    return createErrorResponse(mErrorCode.EditorDisposed, 'Editor was disposed while loading');
  }
  const { artboard } = editor.store.getState();
  const scale = Math.min(
    1,
    (artboard.width * mImageFitRatio) / image.width,
    (artboard.height * mImageFitRatio) / image.height,
  );
  image.scale(scale);
  return ok(placeOnArtboard(editor, image, 'image'));
}
