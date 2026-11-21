import { z } from 'zod';

export const ObjectKindSchema = z.enum(['text', 'rect', 'ellipse', 'image', 'group']);
export type ObjectKind = z.infer<typeof ObjectKindSchema>;

export const TimingSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

export const ObjectMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: ObjectKindSchema,
  locked: z.boolean(),
  hidden: z.boolean(),
  timing: TimingSchema.optional(),
});
export type ObjectMeta = z.infer<typeof ObjectMetaSchema>;
