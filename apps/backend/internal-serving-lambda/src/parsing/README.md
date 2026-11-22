# parsing

Everything that turns an uploaded daily file into parsed JSON: CSV reading and
the daily parser. Nothing here touches the database. Output types live in
`@bho/weather-parsing`. The historical parser stays in `upload-lambda`.
