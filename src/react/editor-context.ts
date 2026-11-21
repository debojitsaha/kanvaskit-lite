import { createContext } from 'react';

import type { Editor } from '@/core/editor/types';

export const EditorContext = createContext<Editor | null>(null);
