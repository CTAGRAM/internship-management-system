import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, companyIdFor } from '../auth.js';
import { HttpError, wrap, required } from '../util.js';

const router = Router();

const WITH_COUNTS = `
  SELECT c.*,
    (SELECT COUNT(*) FROM internships i WHERE i.company_id = c.id) AS internship_count,
    (SELECT COUNT(*) FROM applications a
       JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id = c.id) AS application_count,
    (SELECT COUNT(*) FROM applications a
       JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id = c.id
        AND a.status IN ('selected','offer_accepted','completed')) AS selected_count
  FROM companies c`;

/** GET /api/companies - open to any signed-in user (students browse recruiters). */
router.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    const { q = '' } = req.query;
    const rows = q
      ? db.prepare(`${WITH_COUNTS} WHERE c.name LIKE ? OR c.industry LIKE ? ORDER BY c.name`)
          .all(`%${q}%`, `%${q}%`)
      : db.prepare(`${WITH_COUNTS} ORDER BY c.name`).all();
    res.json(rows);
  }),
);

/** GET /api/companies/public - the signup dropdown, before a token exists. */
router.get(
  '/public',
  wrap((_req, res) => {
    res.json(db.prepare('SELECT id, name FROM companies ORDER BY name').all());
  }),
);

router.get(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const row = db.prepare(`${WITH_COUNTS} WHERE c.id = ?`).get(Number(req.params.id));
    if (!row) throw new HttpError(404, 'Company not found.');
    res.json(row);
  }),
);

/** POST /api/companies - Module 2, placement officer registers a company. */
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  wrap((req, res) => {
    required(req.body, ['name']);
    const { name, industry = '', website = '', location = '', about = '',
            hr_name = '', hr_email = '', verified = 0 } = req.body;
    if (db.prepare('SELECT 1 FROM companies WHERE name = ?').get(name)) {
      throw new HttpError(409, 'A company with that name already exists.');
    }
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO companies (name, industry, website, location, about, hr_name, hr_email, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(String(name).trim(), industry, website, location, about, hr_name, hr_email, verified ? 1 : 0);
    res.status(201).json(db.prepare(`${WITH_COUNTS} WHERE c.id = ?`).get(Number(lastInsertRowid)));
  }),
);

/** PUT /api/companies/:id - admins edit any company, recruiters only their own. */
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'recruiter'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.role === 'recruiter' && companyIdFor(req.user.id) !== id) {
      throw new HttpError(403, 'You can only edit your own company.');
    }
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Company not found.');

    const b = req.body;
    db.prepare(
      `UPDATE companies SET name = ?, industry = ?, website = ?, location = ?,
         about = ?, hr_name = ?, hr_email = ?, verified = ? WHERE id = ?`,
    ).run(
      b.name ?? existing.name,
      b.industry ?? existing.industry,
      b.website ?? existing.website,
      b.location ?? existing.location,
      b.about ?? existing.about,
      b.hr_name ?? existing.hr_name,
      b.hr_email ?? existing.hr_email,
      // Only a placement officer can mark a company verified.
      req.user.role === 'admin' && b.verified !== undefined ? (b.verified ? 1 : 0) : existing.verified,
      id,
    );
    res.json(db.prepare(`${WITH_COUNTS} WHERE c.id = ?`).get(id));
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  wrap((req, res) => {
    const info = db.prepare('DELETE FROM companies WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) throw new HttpError(404, 'Company not found.');
    res.json({ ok: true });
  }),
);

export default router;
