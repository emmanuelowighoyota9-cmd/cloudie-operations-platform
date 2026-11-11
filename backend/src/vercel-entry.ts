// Vercel function entry, compiled to `api/index.js` by
// `scripts/build-vercel-api.mjs` during `npm run build`.
//
// It lives outside `api/` on purpose. Vercel runs every `.ts` file under `api/`
// through its own per-file TypeScript compiler, which clears `files`/`include`
// from the tsconfig it finds — and this repo's root tsconfig is solution-style
// (`"files": []` + `references`), so the resulting program has no root files and
// the build dies with `api/index.ts: Emit skipped`. Shipping a pre-bundled `.js`
// entry keeps the function build to "load a file and call it".
//
// The bundle is self-contained: `vercel.json` rewrites `/api/:path*` to `/api`
// and keeps the original path, which is exactly what Hono's router needs.
import { app } from "./server.js";

export default { fetch: app.fetch };
