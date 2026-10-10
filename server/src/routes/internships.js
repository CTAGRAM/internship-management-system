import { Router } from 'express';
import { db, parseJson } from '../db.js';
import { requireAuth, requireRole, companyIdFor } from '../auth.js';
import { HttpError, wrap, required, evaluateEligibility, notify, isPast } from '../util.js';

const router = Router();

const SELECT_INTERNSHIP = `
  SELECT i.*, c.name AS company_name, c.industry AS company_industry,
         c.verified AS company_verified, c.location AS company_location,
         (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
  FROM internships i JOIN companies c ON c.id = i.company_id`;

const shape = (row) =>
  row && {
    ...row,
    skills: parseJson(row.skills),
    allowed_branches: parseJson(row.allowed_branches),
    allowed_years: parseJson(row.allowed_years),
    expired: isPast(row.deadline),
  };

/**
 * GET /api/internships
 * Module 3 + 4 + 7 (search & filtering). For a student the response is enriched
 * with their own eligibility, skill-match score, and whether they already applied.
 */
router.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    const { q = '', mode = '', location = '', status = '', companyId = '',
            minStipend = '', eligibleOnly = '', sort = 'recent' } = req.query;

    const clauses = [];
    const params = [];
    if (q) {
      clauses.push('(i.title LIKE ? OR i.description LIKE ? OR i.skills LIKE ? OR c.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (mode) { clauses.push('i.work_mode = ?'); params.push(mode); }
    if (location) { clauses.push('i.location LIKE ?'); params.push(`%${location}%`); }
    if (status) { clauses.push('i.status = ?'); params.push(status); }
    if (minStipend) { clauses.push('i.stipend >= ?'); params.push(Number(minStipend)); }

    // Recruiters only ever see their own company's postings.
    if (req.user.role === 'recruiter') {
      clauses.push('i.company_id = ?');
      params.push(companyIdFor(req.user.id) ?? -1);
    } else if (companyId) {
      clauses.push('i.company_id = ?');
      params.push(Number(companyId));
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order =
      sort === 'stipend' ? 'i.stipend DESC' : sort === 'deadline' ? 'i.deadline ASC' : 'i.created_at DESC';

    let rows = db.prepare(`${SELECT_INTERNSHIP} ${where} ORDER BY ${order}`).all(...params).map(shape);

    if (req.user.role === 'student') {
      const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id);
      const applied = new Map(
        db
          .prepare('SELECT internship_id, id, status FROM applications WHERE student_id = ?')
          .all(req.user.id)
          .map((a) => [a.internship_id, a]),
      );
      rows = rows.map((r) => {
        const check = student ? evaluateEligibility(student, r) : { eligible: false, reasons: ['Complete your profile first'], matchScore: 0, matchedSkills: [] };
        const mine = applied.get(r.id);
        return { ...r, ...check, applicationId: mine?.id ?? null, applicationStatus: mine?.status ?? null };
      });
      if (eligibleOnly === 'true') rows = rows.filter((r) => r.eligible || r.applicationId);
      if (sort === 'match') rows.sort((a, b) => b.matchScore - a.matchScore);
    }

    res.json(rows);
  }),
);

/** GET /api/internships/:id */
router.get(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const row = shape(db.prepare(`${SELECT_INTERNSHIP} WHERE i.id = ?`).get(Number(req.params.id)));
    if (!row) throw new HttpError(404, 'Internship not found.');

    if (req.user.role === 'student') {
      const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id);
      const mine = db
        .prepare('SELECT id, status FROM applications WHERE student_id = ? AND internship_id = ?')
        .get(req.user.id, row.id);
      Object.assign(row, student ? evaluateEligibility(student, row) : {}, {
        applicationId: mine?.id ?? null,
        applicationStatus: mine?.status ?? null,
      });
    }
    res.json(row);
  }),
);

function writableCompanyId(req, bodyCompanyId) {
  if (req.user.role === 'recruiter') {
    const id = companyIdFor(req.user.id);
    if (!id) throw new HttpError(400, 'Your account is not linked to a company.');
    return id;
  }
  if (!bodyCompanyId) throw new HttpError(400, 'Select a company for this posting.');
  return Number(bodyCompanyId);
}

/** POST /api/internships - Module 3, recruiters and placement officers post openings. */
router.post(
  '/',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    required(req.body, ['title', 'deadline']);
    const b = req.body;
    const companyId = writableCompanyId(req, b.company_id);
    if (!db.prepare('SELECT 1 FROM companies WHERE id = ?').get(companyId)) {
      throw new HttpError(404, 'Company not found.');
    }

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO internships
          (company_id, title, description, responsibilities, location, work_mode,
           duration_months, stipend, openings, skills, min_cgpa, max_backlogs,
           allowed_branches, allowed_years, deadline, status, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        companyId,
        String(b.title).trim(),
        b.description || '',
        b.responsibilities || '',
        b.location || '',
        b.work_mode || 'onsite',
        Number(b.duration_months) || 3,
        Number(b.stipend) || 0,
        Number(b.openings) || 1,
        JSON.stringify(b.skills || []),
        Number(b.min_cgpa) || 0,
        b.max_backlogs === undefined ? 99 : Number(b.max_backlogs),
        JSON.stringify(b.allowed_branches || []),
        JSON.stringify(b.allowed_years || []),
        b.deadline,
        b.status || 'open',
        req.user.id,
      );

    const created = shape(db.prepare(`${SELECT_INTERNSHIP} WHERE i.id = ?`).get(Number(lastInsertRowid)));

    // Module 9: tell every eligible student there is something new for them.
    const students = db.prepare('SELECT * FROM students').all();
    for (const s of students) {
      if (evaluateEligibility(s, created).eligible) {
        notify(
          s.user_id,
          `New internship: ${created.title}`,
          `${created.company_name} is hiring. You match the eligibility criteria.`,
          `/internships/${created.id}`,
        );
      }
    }
    res.status(201).json(created);
  }),
);

/** PUT /api/internships/:id */
router.put(
  '/:id',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM internships WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Internship not found.');
    if (req.user.role === 'recruiter' && companyIdFor(req.user.id) !== existing.company_id) {
      throw new HttpError(403, 'You can only edit your own postings.');
    }

    const b = req.body;
    const keepJson = (v, fallback) => (v === undefined ? fallback : JSON.stringify(v));
    db.prepare(
      `UPDATE internships SET title=?, description=?, responsibilities=?, location=?, work_mode=?,
        duration_months=?, stipend=?, openings=?, skills=?, min_cgpa=?, max_backlogs=?,
        allowed_branches=?, allowed_years=?, deadline=?, status=? WHERE id=?`,
    ).run(
      b.title ?? existing.title,
      b.description ?? existing.description,
      b.responsibilities ?? existing.responsibilities,
      b.location ?? existing.location,
      b.work_mode ?? existing.work_mode,
      b.duration_months === undefined ? existing.duration_months : Number(b.duration_months),
      b.stipend === undefined ? existing.stipend : Number(b.stipend),
      b.openings === undefined ? existing.openings : Number(b.openings),
      keepJson(b.skills, existing.skills),
      b.min_cgpa === undefined ? existing.min_cgpa : Number(b.min_cgpa),
      b.max_backlogs === undefined ? existing.max_backlogs : Number(b.max_backlogs),
      keepJson(b.allowed_branches, existing.allowed_branches),
      keepJson(b.allowed_years, existing.allowed_years),
      b.deadline ?? existing.deadline,
      b.status ?? existing.status,
      id,
    );
    res.json(shape(db.prepare(`${SELECT_INTERNSHIP} WHERE i.id = ?`).get(id)));
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM internships WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Internship not found.');
    if (req.user.role === 'recruiter' && companyIdFor(req.user.id) !== existing.company_id) {
      throw new HttpError(403, 'You can only delete your own postings.');
    }
    db.prepare('DELETE FROM internships WHERE id = ?').run(id);
    res.json({ ok: true });
  }),
);

/**
 * GET /api/internships/:id/candidates
 * Module 6 - the shortlisting board. Returns every applicant with their
 * profile, match score and current pipeline stage.
 */
router.get(
  '/:id/candidates',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    const internship = shape(db.prepare(`${SELECT_INTERNSHIP} WHERE i.id = ?`).get(id));
    if (!internship) throw new HttpError(404, 'Internship not found.');
    if (req.user.role === 'recruiter' && companyIdFor(req.user.id) !== internship.company_id) {
      throw new HttpError(403, 'Not your posting.');
    }

    const rows = db
      .prepare(
        `SELECT a.*, u.name, u.email, s.enrollment_no, s.branch, s.division, s.year,
                s.cgpa, s.backlogs, s.skills, s.resume_path, s.phone
         FROM applications a
         JOIN students s ON s.user_id = a.student_id
         JOIN users u    ON u.id = s.user_id
         WHERE a.internship_id = ?
         ORDER BY a.match_score DESC, a.applied_at ASC`,
      )
      .all(id);

    res.json({
      internship,
      candidates: rows.map((r) => ({
        ...r,
        skills: parseJson(r.skills),
        hasResume: Boolean(r.resume_path),
        matchedSkills: parseJson(r.skills).filter((sk) =>
          internship.skills.map((x) => x.toLowerCase()).includes(String(sk).toLowerCase()),
        ),
      })),
    });
  }),
);

export default router;
