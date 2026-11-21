import { describe, expect, it } from 'vitest';

import { ObjectKindSchema, ObjectMetaSchema } from '@/core/schema/object-meta';

const mValidMeta = {
  id: 'obj-1',
  name: 'Title',
  kind: 'text',
  locked: false,
  hidden: false,
};

describe('ObjectMetaSchema', () => {
  it('accepts a valid meta without timing', () => {
    const result = ObjectMetaSchema.safeParse(mValidMeta);
    expect(result.success).toBe(true);
  });

  it('accepts a valid timing range', () => {
    const result = ObjectMetaSchema.safeParse({ ...mValidMeta, timing: { start: 0, end: 2.5 } });
    expect(result.success).toBe(true);
  });

  it('rejects negative timing', () => {
    const result = ObjectMetaSchema.safeParse({ ...mValidMeta, timing: { start: -1, end: 2 } });
    expect(result.success).toBe(false);
  });

  it('rejects an empty id', () => {
    const result = ObjectMetaSchema.safeParse({ ...mValidMeta, id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    const result = ObjectMetaSchema.safeParse({ ...mValidMeta, kind: 'video' });
    expect(result.success).toBe(false);
  });

  it('lists the supported object kinds', () => {
    expect(ObjectKindSchema.options).toEqual(['text', 'rect', 'ellipse', 'image', 'group']);
  });
});
