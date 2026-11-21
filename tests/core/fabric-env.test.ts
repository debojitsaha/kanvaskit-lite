import { Rect, StaticCanvas } from 'fabric';
import { afterEach, describe, expect, it } from 'vitest';

describe('fabric environment', () => {
  let mCanvas: StaticCanvas | undefined;

  afterEach(async () => {
    await mCanvas?.dispose();
    mCanvas = undefined;
  });

  it('renders a rect to a PNG data URL', () => {
    const mElement = document.createElement('canvas');
    document.body.appendChild(mElement);

    mCanvas = new StaticCanvas(mElement, { width: 200, height: 100 });
    mCanvas.add(new Rect({ left: 10, top: 10, width: 50, height: 50, fill: '#f00' }));
    mCanvas.renderAll();

    expect(mCanvas.getObjects()).toHaveLength(1);
    expect(mCanvas.toDataURL({ format: 'png', multiplier: 1 })).toMatch(/^data:image\/png/);

    mElement.remove();
  });
});
