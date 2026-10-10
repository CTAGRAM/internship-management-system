/**
 * Vercel serverless entry point.
 *
 * An Express app is itself a (req, res) handler, so it can be exported
 * directly. Vercel's CDN serves the built frontend from web/dist; this
 * function handles /api/* only (see vercel.json).
 */
export { default } from '../server/src/app.js';
