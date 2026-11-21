import { FabricObject } from 'fabric';

import { createId } from '@/core/utils/id';
import { ObjectMetaSchema, type ObjectKind, type ObjectMeta } from '@/core/schema/object-meta';

declare module 'fabric' {
  interface FabricObject {
    meta?: ObjectMeta;
  }
  interface SerializedObjectProps {
    meta?: ObjectMeta;
  }
}

const mMetaKey = 'meta';

const mDefaultNames: Record<ObjectKind, string> = {
  text: 'Text',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  image: 'Image',
  group: 'Group',
};

/** Ensures `meta` is included by `toObject()` for every Fabric class. Idempotent. */
export function registerMetaSerialization(): void {
  if (!FabricObject.customProperties.includes(mMetaKey)) {
    FabricObject.customProperties.push(mMetaKey);
  }
}

/** Returns the object's meta, or undefined when it is missing or fails validation. */
export function getMeta(obj: FabricObject): ObjectMeta | undefined {
  const parsed = ObjectMetaSchema.safeParse(obj.meta);
  return parsed.success ? parsed.data : undefined;
}

export function setMeta(obj: FabricObject, meta: ObjectMeta): void {
  obj.set(mMetaKey, meta);
}

export function createMeta(kind: ObjectKind, name?: string): ObjectMeta {
  return {
    id: createId(),
    name: name ?? mDefaultNames[kind],
    kind,
    locked: false,
    hidden: false,
  };
}
