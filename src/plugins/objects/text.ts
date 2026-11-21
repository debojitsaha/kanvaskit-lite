import { Textbox } from 'fabric';

import { mDefaultTextStyle } from '@/constants/objects';
import type { Editor } from '@/core';

import { placeOnArtboard } from '@/plugins/objects/place';

export function addTextObject(editor: Editor, text?: string): string {
  const textbox = new Textbox(text ?? 'Add your text', {
    ...mDefaultTextStyle,
    textAlign: 'center',
  });
  return placeOnArtboard(editor, textbox, 'text');
}
