import { app } from "../backend/src/server.ts";

// One function for every API route on Vercel.
//
// This project is a Vite app, not Next.js, so `api/[...path].js` is NOT a
// catch-all here: Vercel only supports bracket catch-alls in Next.js and would
// serve the SPA fallback for /api/*. Instead this single entry point exports a
// web-standard fetch handler, and `vercel.json` rewrites `/api/:path*` to it.
// A rewrite keeps the original request path, which is exactly what Hono's own
// router needs to dispatch the request.
export default { fetch: app.fetch };
