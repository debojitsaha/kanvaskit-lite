import { describe, expect, it } from 'vitest';

import { mErrorCode } from '@/core/errors/codes';
import { createErrorResponse, getErrorMessage, ok } from '@/core/errors/result';

describe('ok', () => {
  it('wraps data in a success result', () => {
    expect(ok({ value: 1 })).toEqual({ success: true, data: { value: 1 } });
  });
});

describe('createErrorResponse', () => {
  it('includes details when provided', () => {
    const r = createErrorResponse(mErrorCode.SceneInvalid, 'bad', { field: 'width' });
    expect(r).toEqual({
      success: false,
      error: { code: 'SCENE_INVALID', message: 'bad', details: { field: 'width' } },
    });
  });

  it('omits the details key when not provided', () => {
    const r = createErrorResponse(mErrorCode.CommandFailed, 'nope');
    expect(r.success).toBe(false);
    if (r.success) return;
    expect('details' in r.error).toBe(false);
    expect(r.error).toEqual({ code: 'COMMAND_FAILED', message: 'nope' });
  });
});

describe('getErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns a string unchanged', () => {
    expect(getErrorMessage('plain')).toBe('plain');
  });

  it('stringifies a number', () => {
    expect(getErrorMessage(42)).toBe('42');
  });
});
