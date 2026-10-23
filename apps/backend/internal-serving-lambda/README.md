# internal-serving-lambda

Lambda behind API Gateway that serves internal API routes. A handler
receives every request and dispatches it to a route handler based on the HTTP
method and resource path.

## Layout

```
src/
  handler.ts      # Lambda entry point: looks up the route, handles 404/500
  routes.ts       # Route table mapping "METHOD /path" to a handler
  response.ts     # response(statusCode, body) helper for JSON responses
  routes/         # One file per route handler
    health.ts
```

## How to add a route

1. **Create the handler** in `src/routes/`, typed as `RouteHandler`, and build
   the return value with `response()`:

   ```ts
   // src/routes/stations.ts
   import type { RouteHandler } from '../routes';
   import { response } from '../response';

   export const handlerName: RouteHandler = async (event) => {
     // Handler code
   };
   ```

2. **Register route** in `src/routes.ts`:

   ```ts
   import { healthHandler } from './routes/health';
   // Import handler here

   export const routes: Record<string, RouteHandler> = {
     'GET /health': healthHandler,
     // Add route here
   };
   ```

3. **Document it** in `openapi.yml`.

## Conventions

- Return through `response()` so every route sends the same headers.
- Uncaught errors are logged and returned as a `500` by `handler.ts`. Throw
  for unexpected failures, and return `4xx` responses explicitly for bad input.
- Unregistered method/path combinations return `404` automatically.
