export const mErrorCode = {
  CommandNotFound: 'COMMAND_NOT_FOUND',
  CommandFailed: 'COMMAND_FAILED',
  EditorDisposed: 'EDITOR_DISPOSED',
  InvalidUrl: 'INVALID_URL',
  ImageLoadFailed: 'IMAGE_LOAD_FAILED',
  ImageCorsBlocked: 'IMAGE_CORS_BLOCKED',
  FileTypeUnsupported: 'FILE_TYPE_UNSUPPORTED',
  FileTooLarge: 'FILE_TOO_LARGE',
  NothingSelected: 'NOTHING_SELECTED',
  SceneInvalid: 'SCENE_INVALID',
  SceneVersionUnsupported: 'SCENE_VERSION_UNSUPPORTED',
} as const;
export type ErrorCode = (typeof mErrorCode)[keyof typeof mErrorCode];
