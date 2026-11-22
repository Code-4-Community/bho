import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseUpload } from './parse-upload';
import { parseHistorical } from './parsers/historical';

const s3 = mockClient(S3Client);
const location = { bucket: 'bho-uploads', key: 'historical/records.csv' };
const fixture = (name: string) =>
  readFileSync(join(__dirname, 'parsers/__fixtures__', name), 'utf8');

// Only the part of the SDK's stream type that the helper reads.
const body = (text: string) =>
  ({ transformToByteArray: async () => Buffer.from(text) } as never);

beforeEach(() => s3.reset());

describe('parseUpload', () => {
  it('reads the object at the location, parses it and hashes it', async () => {
    const csv = fixture('historical.csv');
    s3.on(GetObjectCommand).resolves({ Body: body(csv) });

    const { fileHash, result } = await parseUpload(location, parseHistorical);

    expect(result.ok && result.rows).toHaveLength(366);
    expect(fileHash).toBe(createHash('sha256').update(csv).digest('hex'));
    expect(s3.commandCalls(GetObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'bho-uploads',
      Key: 'historical/records.csv',
    });
  });

  it("returns the parser's errors for a bad file", async () => {
    s3.on(GetObjectCommand).resolves({ Body: body('a,b\n1,2') });

    expect((await parseUpload(location, parseHistorical)).result).toEqual({
      ok: false,
      errors: [{ reason: 'No header row with "Month #" and "Day"' }],
    });
  });

  it('treats an object with no body as an empty file', async () => {
    s3.on(GetObjectCommand).resolves({});

    expect((await parseUpload(location, parseHistorical)).result).toEqual({
      ok: false,
      errors: [{ reason: 'No header row with "Month #" and "Day"' }],
    });
  });

  it('throws when S3 cannot return the object', async () => {
    s3.on(GetObjectCommand).rejects(
      new NoSuchKey({ message: 'gone', $metadata: {} }),
    );

    await expect(parseUpload(location, parseHistorical)).rejects.toThrow(
      NoSuchKey,
    );
  });
});
