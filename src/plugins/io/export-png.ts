import type { TMat2D } from 'fabric';

import {
  createErrorResponse,
  getErrorMessage,
  mErrorCode,
  ok,
  type Editor,
  type Result,
} from '@/core';
import { getSelectedUserObjects } from '@/plugins/shared/find';
import { selectObjects } from '@/plugins/shared/layers';

const mMaxExportSide = 8192;
const mMaxMultiplier = 4;
const mIdentityMatrix: TMat2D = [1, 0, 0, 1, 0, 0];

/** Renders the artboard (only) to a PNG data URL, independent of the current viewport. */
export function exportArtboardPng(editor: Editor, multiplier: number): Result<string> {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > mMaxMultiplier) {
    return createErrorResponse(mErrorCode.CommandFailed, 'Invalid export multiplier');
  }
  const { canvas, store } = editor;
  const { artboard } = store.getState();
  if (
    artboard.width * multiplier > mMaxExportSide ||
    artboard.height * multiplier > mMaxExportSide
  ) {
    return createErrorResponse(mErrorCode.CommandFailed, 'Export size too large');
  }

  const previousViewport: TMat2D = [...canvas.viewportTransform];
  const previousSelection = getSelectedUserObjects(canvas);
  canvas.discardActiveObject();
  canvas.setViewportTransform(mIdentityMatrix);
  try {
    const dataUrl = canvas.toDataURL({
      format: 'png',
      left: 0,
      top: 0,
      width: artboard.width,
      height: artboard.height,
      multiplier,
    });
    return ok(dataUrl);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'SecurityError') {
      return createErrorResponse(
        mErrorCode.ImageCorsBlocked,
        'Canvas contains a cross-origin image',
      );
    }
    console.error('[kanvaskit] PNG export failed', error);
    return createErrorResponse(mErrorCode.CommandFailed, getErrorMessage(error));
  } finally {
    canvas.setViewportTransform(previousViewport);
    selectObjects(editor, previousSelection);
    canvas.requestRenderAll();
  }
}
