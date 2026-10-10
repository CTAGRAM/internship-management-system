import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'ims-dev-secret-change-in-production';
const EXPIRES_IN = '7d';

export const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

/**
 * Populates req.user from the Bearer token. Does not reject on its own --
 * `requireAuth` / `requireRole` decide what is allowed through.
 */
export function readToken(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const claims = jwt.verify(token, SECRET);
      const user = db
        .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
        .get(claims.id);
      if (user) req.user = user;
    } catch {
      /* expired or tampered token -> stay anonymous */
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this action.' });
    }
    next();
  };
}

/** The company this recruiter belongs to, or null. */
export function companyIdFor(userId) {
  const row = db.prepare('SELECT company_id FROM company_users WHERE user_id = ?').get(userId);
  return row ? row.company_id : null;
}
