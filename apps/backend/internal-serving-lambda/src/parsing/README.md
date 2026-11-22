# parsing

Everything that turns an uploaded file into parsed JSON: CSV reading, the
historical and daily parsers, and the S3 read + file hash (`parse-upload.ts`).
Nothing here touches the database. Output types live in `@bho/weather-parsing`.
