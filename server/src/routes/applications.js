import { Router } from 'express';
import { db, parseJson } from '../db.js';
import { requireAuth, requireRole, companyIdFor } from '../auth.js';
import {
  HttpError, wrap, evaluateEligibility, notify, logStatusChange, STATUS_LABELS,
} from '../util.js';

const router = Router();

const SELECT_APPLICATION = `
  SELECT a.*, i.title, i.location, i.work_mode, i.stipend, i.duration_months,
         i.deadline, i.skills AS internship_skills, i.company_id,
         c.name AS company_name, c.industry AS company_industry,
         u.name AS student_name, u.email AS student_email,
         s.enrollment_no, s.branch, s.division, s.year, s.cgpa, s.backlogs,
         s.skills AS student_skills, s.phone, s.resume_path
  FROM applications a
  JOIN internships i ON i.id = a.internship_id
  JOIN companies  c ON c.id = i.company_id
  JOIN students   s ON s.user_id = a.student_id
  JOIN users      u ON u.id = s.user_id`;

const shape = (row) =>
  row && {
    ...row,
    internship_skills: parseJson(row.internship_skills),
    student_skills: parseJson(row.student_skills),
    hasResume: Boolean(row.resume_path),
    status_label: STATUS_LABELS[row.status] ?? row.status,
  };

/** Who is allowed to touch this application? */
function assertCanManage(req, row) {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'recruiter' && companyIdFor(req.user.id) === row.company_id) return;
  throw new HttpError(403, 'You do not have access to this application.');
}

/**
 * GET /api/applications
 * Students see their own, recruiters see their company's, admins see all.
 */
router.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    const { status = '', internshipId = '', q = '' } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'student') {
      clauses.push('a.student_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'recruiter') {
      clauses.push('i.company_id = ?');
      params.push(companyIdFor(req.user.id) ?? -1);
    }
    if (status) { clauses.push('a.status = ?'); params.push(status); }
    if (internshipId) { clauses.push('a.internship_id = ?'); params.push(Number(internshipId)); }
    if (q) {
      clauses.push('(u.name LIKE ? OR i.title LIKE ? OR c.name LIKE ? OR s.enrollment_no LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    res.json(
      db.prepare(`${SELECT_APPLICATION} ${where} ORDER BY a.updated_at DESC`).all(...params).map(shape),
    );
  }),
);

/** GET /api/applications/:id - detail with the full status timeline and interviews. */
router.get(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    const row = shape(db.prepare(`${SELECT_APPLICATION} WHERE a.id = ?`).get(id));
    if (!row) throw new HttpError(404, 'Application not found.');
    if (req.user.role === 'student' && row.student_id !== req.user.id) {
      throw new HttpError(403, 'Not your application.');
    }
    if (req.user.role === 'recruiter') assertCanManage(req, row);

    row.timeline = db
      .prepare(
        `SELECT e.*, u.name AS actor_name FROM application_events e
         LEFT JOIN users u ON u.id = e.actor_id
         WHERE e.application_id = ? ORDER BY e.created_at ASC, e.id ASC`,
      )
      .all(id);
    row.interviews = db
      .prepare('SELECT * FROM interviews WHERE application_id = ? ORDER BY scheduled_at ASC')
      .all(id);
    res.json(row);
  }),
);

/** POST /api/applications - Module 5, a student applies. Eligibility is enforced. */
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  wrap((req, res) => {
    const internshipId = Number(req.body.internship_id);
    if (!internshipId) throw new HttpError(400, 'internship_id is required.');

    const internship = db.prepare('SELECT * FROM internships WHERE id = ?').get(internshipId);
    if (!internship) throw new HttpError(404, 'Internship not found.');

    const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id);
    if (!student) throw new HttpError(400, 'Complete your student profile first.');

    const already = db
      .prepare('SELECT 1 FROM applications WHERE internship_id = ? AND student_id = ?')
      .get(internshipId, req.user.id);
    if (already) throw new HttpError(409, 'You have already applied to this internship.');

    const check = evaluateEligibility(student, internship);
    if (!check.eligible) {
      throw new HttpError(400, `You are not eligible: ${check.reasons.join('; ')}`);
    }

    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO applications (internship_id, student_id, cover_note, match_score)
           VALUES (?, ?, ?, ?)`,
        )
        .run(internshipId, req.user.id, req.body.cover_note || '', check.matchScore);
      const appId = Number(lastInsertRowid);

      logStatusChange({
        applicationId: appId, from: null, to: 'applied',
        note: 'Application submitted', actorId: req.user.id,
      });

      // Let the posting's recruiters know.
      const recruiters = db
        .prepare('SELECT user_id FROM company_users WHERE company_id = ?')
        .all(internship.company_id);
      for (const r of recruiters) {
        notify(
          r.user_id,
          `New application for ${internship.title}`,
          `${req.user.name} applied with a ${check.matchScore}% skill match.`,
          `/pipeline/${internshipId}`,
        );
      }
      return appId;
    })();

    res.status(201).json(shape(db.prepare(`${SELECT_APPLICATION} WHERE a.id = ?`).get(id)));
  }),
);

/**
 * PATCH /api/applications/:id/status
 * Modules 6 & 8 - shortlist, reject, select, record an offer.
 * Students may only use it to accept or decline an offer they received.
 */
router.patch(
  '/:id/status',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    const { status, note = '' } = req.body;
    if (!STATUS_LABELS[status]) throw new HttpError(400, 'Unknown status.');

    const row = db
      .prepare(
        `SELECT a.*, i.title, i.company_id, c.name AS company_name
         FROM applications a
         JOIN internships i ON i.id = a.internship_id
         JOIN companies  c ON c.id = i.company_id
         WHERE a.id = ?`,
      )
      .get(id);
    if (!row) throw new HttpError(404, 'Application not found.');

    const studentDecisions = ['offer_accepted', 'offer_declined'];
    if (req.user.role === 'student') {
      if (row.student_id !== req.user.id) throw new HttpError(403, 'Not your application.');
      if (!studentDecisions.includes(status)) {
        throw new HttpError(403, 'You can only accept or decline an offer.');
      }
      if (row.status !== 'selected') {
        throw new HttpError(400, 'There is no offer to respond to yet.');
      }
    } else {
      assertCanManage(req, row);
      if (studentDecisions.includes(status)) {
        throw new HttpError(400, 'Only the student can accept or decline their offer.');
      }
    }

    const { offer_stipend, offer_joining_date, offer_note } = req.body;

    db.transaction(() => {
      db.prepare(
        `UPDATE applications SET status = ?, updated_at = datetime('now'),
           offer_stipend = COALESCE(?, offer_stipend),
           offer_joining_date = COALESCE(?, offer_joining_date),
           offer_note = COALESCE(?, offer_note)
         WHERE id = ?`,
      ).run(
        status,
        offer_stipend === undefined ? null : Number(offer_stipend),
        offer_joining_date ?? null,
        offer_note ?? null,
        id,
      );
      logStatusChange({
        applicationId: id, from: row.status, to: status, note, actorId: req.user.id,
      });

      if (req.user.role === 'student') {
        for (const r of db.prepare('SELECT user_id FROM company_users WHERE company_id = ?').all(row.company_id)) {
          notify(
            r.user_id,
            `Offer ${status === 'offer_accepted' ? 'accepted' : 'declined'} - ${row.title}`,
            `${req.user.name} has responded to the offer.`,
            `/pipeline/${row.internship_id}`,
          );
        }
      } else {
        notify(
          row.student_id,
          `${row.title} - ${STATUS_LABELS[status]}`,
          note || `${row.company_name} updated your application status.`,
          `/applications/${id}`,
        );
      }
    })();

    res.json(shape(db.prepare(`${SELECT_APPLICATION} WHERE a.id = ?`).get(id)));
  }),
);

/** PATCH /api/applications/bulk-status - shortlist or reject several at once. */
router.patch(
  '/bulk/status',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const { ids = [], status, note = '' } = req.body;
    if (!Array.isArray(ids) || !ids.length) throw new HttpError(400, 'No applications selected.');
    if (!STATUS_LABELS[status]) throw new HttpError(400, 'Unknown status.');
    if (['offer_accepted', 'offer_declined'].includes(status)) {
      throw new HttpError(400, 'Only the student can accept or decline an offer.');
    }

    let updated = 0;
    db.transaction(() => {
      for (const rawId of ids) {
        const id = Number(rawId);
        const row = db
          .prepare(
            `SELECT a.*, i.title, i.company_id, c.name AS company_name
             FROM applications a
             JOIN internships i ON i.id = a.internship_id
             JOIN companies  c ON c.id = i.company_id WHERE a.id = ?`,
          )
          .get(id);
        if (!row) continue;
        assertCanManage(req, row);

        db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?")
          .run(status, id);
        logStatusChange({ applicationId: id, from: row.status, to: status, note, actorId: req.user.id });
        notify(
          row.student_id,
          `${row.title} - ${STATUS_LABELS[status]}`,
          note || `${row.company_name} updated your application status.`,
          `/applications/${id}`,
        );
        updated += 1;
      }
    })();

    res.json({ ok: true, updated });
  }),
);

/** DELETE /api/applications/:id - a student withdraws before being processed. */
router.delete(
  '/:id',
  requireAuth,
  wrap((req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    if (!row) throw new HttpError(404, 'Application not found.');
    if (req.user.role === 'student') {
      if (row.student_id !== req.user.id) throw new HttpError(403, 'Not your application.');
      if (row.status !== 'applied') {
        throw new HttpError(400, 'You can only withdraw while the application is still under review.');
      }
    } else if (req.user.role !== 'admin') {
      throw new HttpError(403, 'Not allowed.');
    }
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
    res.json({ ok: true });
  }),
);

export default router;
