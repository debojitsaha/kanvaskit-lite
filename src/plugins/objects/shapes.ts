import { Ellipse, Rect } from 'fabric';

import { mDefaultEllipse, mDefaultRect } from '@/constants/objects';
import type { Editor } from '@/core';

import { placeOnArtboard } from '@/plugins/objects/place';

export function addRectObject(editor: Editor): string {
  return placeOnArtboard(editor, new Rect({ ...mDefaultRect }), 'rect');
}

export function addEllipseObject(editor: Editor): string {
  return placeOnArtboard(editor, new Ellipse({ ...mDefaultEllipse }), 'ellipse');
}
