# Upload keys

Staff upload CSVs straight to S3 with a short-lived presigned PUT URL, so the frontend never holds AWS credentials. `createUploadUrlHandler` in `apps/backend/internal-serving-lambda/src/routes/create-upload-url.ts` builds the object key, and `createUploadUrl` in `libs/file-store` signs the URL. When `LOCAL_UPLOAD_DIR` is set (local dev), the URL points at the local dev server instead; see the README.

## Key format

```
<uploadType>/<date>/<uuid>.csv
daily/2026-10-26/3f2b6c1e-8a4d-4b7e-9c2f-1d5e6a7b8c9d.csv
```

| Part         | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| `uploadType` | `daily` or `historical`, the same values as `imports.kind` |
| `date`       | UTC date the URL was created, `YYYY-MM-DD`                 |
| `uuid`       | Random, from `crypto.randomUUID()`                         |

## Decisions

- **The server builds the key.** The client only picks the upload type and sends a file name. The file name is checked but never goes into the key, so a client can't choose a path or overwrite another file.
- **One bucket, split by prefix.** Daily and historical uploads share a bucket and permissions, and the first part of the key tells them apart.
- **The date groups uploads by day.** That makes the bucket easy to browse. It's the day the URL was created, not the date of the data in the file.
- **A random id, not the file name.** Names can contain spaces, slashes, or repeats. A re-upload of the same file gets a new key, which matches `imports` adding a new row for every upload.
- **The key always ends in lowercase `.csv`**, even for `OBS.CSV`. The S3 trigger in `UploadStack` (PR #34) matches the `.csv` suffix case-sensitively, so every upload made with these URLs triggers it.

## Using the URL

- It expires after 5 minutes.
- The PUT must send `Content-Type: text/csv`, or S3 rejects it. The frontend should set the header itself, because some browsers report a CSV file as `application/vnd.ms-excel`.
- The file store's S3 client is created with `requestChecksumCalculation: 'WHEN_REQUIRED'`. With the SDK default, the URL carries a checksum of an empty body and S3 rejects the real file.

## Not handled yet

- **The original file name and the uploader aren't stored.** `imports` needs `fileName` and `uploadedBy`, but neither is in the key. A later ticket needs to pass them along, for example as S3 object metadata on the presigned URL.
