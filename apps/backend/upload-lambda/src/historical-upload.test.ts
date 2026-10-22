import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseHistoricalUpload } from './historical-upload';

const s3 = mockClient(S3Client);
const location = { bucket: 'bho-uploads', key: 'historical/records.csv' };

// Only the part of the SDK's stream type that the helper reads.
const body = (text: string) =>
  ({ transformToString: async () => text } as never);

beforeEach(() => s3.reset());

describe('parseHistoricalUpload', () => {
  it('reads the object at the location and parses it', async () => {
    const csv = readFileSync(
      join(__dirname, 'parsers/__fixtures__/historical.csv'),
      'utf8',
    );
    s3.on(GetObjectCommand).resolves({ Body: body(csv) });

    const result = await parseHistoricalUpload(location);

    expect(result.ok && result.rows).toHaveLength(366);
    expect(s3.commandCalls(GetObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'bho-uploads',
      Key: 'historical/records.csv',
    });
  });

  it("returns the parser's errors for a bad file", async () => {
    s3.on(GetObjectCommand).resolves({ Body: body('a,b\n1,2') });

    expect(await parseHistoricalUpload(location)).toEqual({
      ok: false,
      errors: [{ reason: 'No header row with "Month #" and "Day"' }],
    });
  });

  it('treats an object with no body as an empty file', async () => {
    s3.on(GetObjectCommand).resolves({});

    expect(await parseHistoricalUpload(location)).toMatchObject({ ok: false });
  });

  it('throws when S3 cannot return the object', async () => {
    s3.on(GetObjectCommand).rejects(
      new NoSuchKey({ message: 'gone', $metadata: {} }),
    );

    await expect(parseHistoricalUpload(location)).rejects.toThrow(NoSuchKey);
  });
});
