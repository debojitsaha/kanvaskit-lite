import { z } from 'zod';

import { mAppId, mMaxArtboardSize } from '@/constants/editor';

export const ArtboardSchema = z.object({
  width: z.number().int().positive().max(mMaxArtboardSize),
  height: z.number().int().positive().max(mMaxArtboardSize),
  background: z.string().min(1),
});
export type Artboard = z.infer<typeof ArtboardSchema>;

export const SceneDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  app: z.literal(mAppId),
  artboard: ArtboardSchema,
  canvas: z.record(z.string(), z.unknown()),
});
export type SceneDocument = z.infer<typeof SceneDocumentSchema>;
