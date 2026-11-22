export type UploadFileType = 'upload' | 'reupload';

/** One rejected thing and why. Used by UploadFile (client checks) and FileRejected (also backend parse errors). */
export interface FileRejection {
  /** What was rejected, e.g. "FileName.pdf" or "Date []". */
  item: string;
  /** e.g. "Incorrect file format", "Missing required field". */
  reason: string;
}

export const REJECT_REASON_FORMAT = 'Incorrect file format';
export const REJECT_REASON_SIZE = 'File exceeds maximum size';
