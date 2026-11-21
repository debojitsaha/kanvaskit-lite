import { describe, expect, it } from 'vitest';

import { sanitizeUrl } from '@/core/utils/sanitize-url';

describe('sanitizeUrl', () => {
  it.each([
    'https://example.com/a.png',
    'http://example.com/a.png',
    'blob:https://example.com/3f2c-uuid',
    'data:image/png;base64,iVBORw0KGgo=',
  ])('accepts %s', (input) => {
    const r = sanitizeUrl(input);
    expect(r.success).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ftp://x',
    'data:text/html,<b>',
    'not a url',
    '',
  ])('rejects %j with INVALID_URL', (input) => {
    const r = sanitizeUrl(input);
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.code).toBe('INVALID_URL');
  });

  it('trims surrounding whitespace', () => {
    const r = sanitizeUrl('  https://example.com/x.png \n');
    expect(r).toEqual({ success: true, data: 'https://example.com/x.png' });
  });

  it('returns a data image URL unchanged apart from trimming', () => {
    const r = sanitizeUrl('  data:image/png;base64,iVBORw0KGgo=  ');
    expect(r).toEqual({ success: true, data: 'data:image/png;base64,iVBORw0KGgo=' });
  });
});
