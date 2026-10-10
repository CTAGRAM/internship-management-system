import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';
import { HttpError, wrap, required, notify } from '../util.js';

const router = Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

/** POST /api/auth/register - students self-register; recruiters pick a company. */
router.post(
  '/register',
  wrap((req, res) => {
    const { name, email, password, role = 'student' } = req.body;
    required(req.body, ['name', 'email', 'password']);

    if (!['student', 'recruiter'].includes(role)) {
      throw new HttpError(400, 'You can register as a student or a recruiter.');
    }
    if (String(password).length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters.');
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'An account with this email already exists.');
    }

    const created = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(String(name).trim(), String(email).trim(), hashPassword(password), role);
      const userId = Number(lastInsertRowid);

      if (role === 'student') {
        const { enrollment_no, branch, division, year, cgpa } = req.body;
        if (!enrollment_no) throw new HttpError(400, 'Enrolment number is required.');
        if (db.prepare('SELECT 1 FROM students WHERE enrollment_no = ?').get(enrollment_no)) {
          throw new HttpError(409, 'That enrolment number is already registered.');
        }
        db.prepare(
          `INSERT INTO students (user_id, enrollment_no, branch, division, year, cgpa)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(
          userId,
          String(enrollment_no).trim(),
          branch || 'CSE',
          division || '',
          Number(year) || 3,
          Number(cgpa) || 0,
        );
      } else {
        const { company_id, company_name } = req.body;
        let companyId = Number(company_id) || null;
        if (!companyId) {
          if (!company_name) throw new HttpError(400, 'Choose a company or enter a new one.');
          const existing = db.prepare('SELECT id FROM companies WHERE name = ?').get(company_name);
          companyId = existing
            ? existing.id
            : Number(
                db
                  .prepare('INSERT INTO companies (name, hr_name, hr_email) VALUES (?, ?, ?)')
                  .run(String(company_name).trim(), name, email).lastInsertRowid,
              );
        }
        db.prepare('INSERT INTO company_users (user_id, company_id) VALUES (?, ?)').run(
          userId,
          companyId,
        );
      }

      notify(
        userId,
        'Welcome to the Internship Management System',
        role === 'student'
          ? 'Complete your profile to get internship recommendations matched to your skills.'
          : 'Post your first internship opening to start receiving applications.',
        role === 'student' ? '/profile' : '/postings',
      );
      return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId);
    })();

    res.status(201).json({ token: signToken(created), user: publicUser(created) });
  }),
);

/** POST /api/auth/login */
router.post(
  '/login',
  wrap((req, res) => {
    const { email, password } = req.body;
    required(req.body, ['email', 'password']);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, 'Incorrect email or password.');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

/** GET /api/auth/me - who am I, plus the role-specific profile. */
router.get(
  '/me',
  requireAuth,
  wrap((req, res) => {
    const out = { user: publicUser(req.user) };
    if (req.user.role === 'student') {
      out.student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id) || null;
    }
    if (req.user.role === 'recruiter') {
      out.company =
        db
          .prepare(
            `SELECT c.* FROM companies c
             JOIN company_users cu ON cu.company_id = c.id
             WHERE cu.user_id = ?`,
          )
          .get(req.user.id) || null;
    }
    res.json(out);
  }),
);

export default router;
