import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { db, parseJson, UPLOAD_DIR } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { HttpError, wrap } from '../util.js';

const router = Router();

/** DB row -> API shape (JSON columns decoded, password never present). */
export function shapeStudent(row) {
  if (!row) return null;
  return {
    ...row,
    skills: parseJson(row.skills),
    certifications: parseJson(row.certifications),
    projects: parseJson(row.projects),
    hasResume: Boolean(row.resume_path),
  };
}

const SELECT_STUDENT = `
  SELECT s.*, u.name, u.email
  FROM students s JOIN users u ON u.id = s.user_id`;

/** GET /api/students - placement officers and recruiters browse the student pool. */
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'recruiter'),
  wrap((req, res) => {
    const { q = '', branch = '', year = '', minCgpa = '' } = req.query;
    const clauses = [];
    const params = [];

    if (q) {
      clauses.push('(u.name LIKE ? OR u.email LIKE ? OR s.enrollment_no LIKE ? OR s.skills LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (branch) { clauses.push('s.branch = ?'); params.push(branch); }
    if (year) { clauses.push('s.year = ?'); params.push(Number(year)); }
    if (minCgpa) { clauses.push('s.cgpa >= ?'); params.push(Number(minCgpa)); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`${SELECT_STUDENT} ${where} ORDER BY u.name`).all(...params);
    res.json(rows.map(shapeStudent));
  }),
);

/** GET /api/students/:id - own profile, or any profile for staff. */
router.get(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    const isSelf = req.user.id === id;
    if (!isSelf && !['admin', 'recruiter'].includes(req.user.role)) {
      throw new HttpError(403, 'You can only view your own profile.');
    }
    const row = db.prepare(`${SELECT_STUDENT} WHERE s.user_id = ?`).get(id);
    if (!row) throw new HttpError(404, 'Student not found.');
    res.json(shapeStudent(row));
  }),
);

/** PUT /api/students/:id - a student edits their own profile (Module 1). */
router.put(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.id !== id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You can only edit your own profile.');
    }
    const existing = db.prepare('SELECT * FROM students WHERE user_id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Student not found.');

    const b = req.body;
    const asJson = (v, fallbackRaw) => (v === undefined ? fallbackRaw : JSON.stringify(v));

    db.transaction(() => {
      if (b.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(b.name).trim(), id);
      db.prepare(
        `UPDATE students SET
           phone = ?, branch = ?, division = ?, year = ?, cgpa = ?, backlogs = ?,
           location = ?, bio = ?, skills = ?, certifications = ?, projects = ?,
           linkedin = ?, github = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
      ).run(
        b.phone ?? existing.phone,
        b.branch ?? existing.branch,
        b.division ?? existing.division,
        b.year === undefined ? existing.year : Number(b.year),
        b.cgpa === undefined ? existing.cgpa : Number(b.cgpa),
        b.backlogs === undefined ? existing.backlogs : Number(b.backlogs),
        b.location ?? existing.location,
        b.bio ?? existing.bio,
        asJson(b.skills, existing.skills),
        asJson(b.certifications, existing.certifications),
        asJson(b.projects, existing.projects),
        b.linkedin ?? existing.linkedin,
        b.github ?? existing.github,
        id,
      );
    })();

    res.json(shapeStudent(db.prepare(`${SELECT_STUDENT} WHERE s.user_id = ?`).get(id)));
  }),
);

// ----------------------------------------------------------- resume upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(null, `resume-${req.user.id}-${Date.now()}${path.extname(file.originalname) || '.pdf'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(ok.includes(file.mimetype) ? null : new HttpError(400, 'Upload a PDF or Word document.'), ok.includes(file.mimetype));
  },
});

/** POST /api/students/:id/resume */
router.post(
  '/:id/resume',
  requireAuth,
  upload.single('resume'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.id !== id) throw new HttpError(403, 'You can only upload your own resume.');
    if (!req.file) throw new HttpError(400, 'No file was uploaded.');

    const previous = db.prepare('SELECT resume_path FROM students WHERE user_id = ?').get(id);
    db.prepare(
      "UPDATE students SET resume_path = ?, resume_name = ?, updated_at = datetime('now') WHERE user_id = ?",
    ).run(req.file.filename, req.file.originalname, id);

    // Replace, don't accumulate.
    if (previous?.resume_path) {
      fs.rm(path.join(UPLOAD_DIR, previous.resume_path), { force: true }, () => {});
    }
    res.json({ ok: true, resume_name: req.file.originalname });
  }),
);

/** GET /api/students/:id/resume - the student, recruiters and staff may download. */
router.get(
  '/:id/resume',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.id !== id && !['admin', 'recruiter'].includes(req.user.role)) {
      throw new HttpError(403, 'Not allowed.');
    }
    const row = db.prepare('SELECT resume_path, resume_name FROM students WHERE user_id = ?').get(id);
    if (!row?.resume_path) throw new HttpError(404, 'No resume uploaded yet.');
    res.download(path.join(UPLOAD_DIR, row.resume_path), row.resume_name || 'resume.pdf');
  }),
);

export default router;
