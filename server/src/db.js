import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * On a serverless host (Vercel) the project directory is read-only and only
 * /tmp is writable, so the database and uploads move there. That storage is
 * per-instance and temporary, which is why the Vercel deployment is a demo:
 * it reseeds itself whenever a cold instance starts. A normal server, Docker
 * or any host with a disk keeps everything under server/ as usual.
 */
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const DATA_DIR =
  process.env.DATA_DIR || (SERVERLESS ? '/tmp/ims-data' : path.join(here, '..', 'data'));
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || (SERVERLESS ? '/tmp/ims-uploads' : path.join(here, '..', 'uploads'));
export const IS_EPHEMERAL = SERVERLESS;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'ims.db');

export const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));

/**
 * Parse a JSON text column, never throwing. Already-decoded values pass
 * straight through, so it is safe to call on a row that has been shaped once
 * already (the eligibility helpers run on both raw and shaped rows).
 */
export function parseJson(value, fallback = []) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
