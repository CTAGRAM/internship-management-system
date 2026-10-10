import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, companyIdFor } from '../auth.js';
import { HttpError, wrap, required, notify, logStatusChange } from '../util.js';

const router = Router();

const SELECT_INTERVIEW = `
  SELECT iv.*, a.student_id, a.status AS application_status, a.internship_id,
         i.title, i.company_id, c.name AS company_name,
         u.name AS student_name, u.email AS student_email, s.enrollment_no, s.branch
  FROM interviews iv
  JOIN applications a ON a.id = iv.application_id
  JOIN internships  i ON i.id = a.internship_id
  JOIN companies    c ON c.id = i.company_id
  JOIN students     s ON s.user_id = a.student_id
  JOIN users        u ON u.id = s.user_id`;

function assertCanManage(req, row) {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'recruiter' && companyIdFor(req.user.id) === row.company_id) return;
  throw new HttpError(403, 'You do not have access to this interview.');
}

/** GET /api/interviews - the schedule, scoped to the caller's role. */
router.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    const { upcoming = '' } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'student') { clauses.push('a.student_id = ?'); params.push(req.user.id); }
    else if (req.user.role === 'recruiter') {
      clauses.push('i.company_id = ?');
      params.push(companyIdFor(req.user.id) ?? -1);
    }
    if (upcoming === 'true') clauses.push("iv.scheduled_at >= datetime('now')");

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    res.json(db.prepare(`${SELECT_INTERVIEW} ${where} ORDER BY iv.scheduled_at ASC`).all(...params));
  }),
);

/** POST /api/interviews - Module 7, schedule a round and move the application forward. */
router.post(
  '/',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    required(req.body, ['application_id', 'scheduled_at']);
    const { application_id, scheduled_at, round = 'Technical', mode = 'online',
            venue = '', meeting_link = '', notes = '' } = req.body;

    const app = db
      .prepare(
        `SELECT a.*, i.title, i.company_id, c.name AS company_name
         FROM applications a
         JOIN internships i ON i.id = a.internship_id
         JOIN companies  c ON c.id = i.company_id
         WHERE a.id = ?`,
      )
      .get(Number(application_id));
    if (!app) throw new HttpError(404, 'Application not found.');
    assertCanManage(req, app);

    if (mode === 'online' && !meeting_link) {
      throw new HttpError(400, 'An online interview needs a meeting link.');
    }
    if (mode === 'offline' && !venue) {
      throw new HttpError(400, 'An in-person interview needs a venue.');
    }

    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO interviews (application_id, round, scheduled_at, mode, venue, meeting_link, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(Number(application_id), round, scheduled_at, mode, venue, meeting_link, notes);

      // Scheduling an interview advances the pipeline.
      if (app.status !== 'interview_scheduled') {
        db.prepare("UPDATE applications SET status = 'interview_scheduled', updated_at = datetime('now') WHERE id = ?")
          .run(app.id);
        logStatusChange({
          applicationId: app.id, from: app.status, to: 'interview_scheduled',
          note: `${round} round scheduled`, actorId: req.user.id,
        });
      }

      const when = new Date(scheduled_at).toLocaleString('en-IN', {
        dateStyle: 'medium', timeStyle: 'short',
      });
      notify(
        app.student_id,
        `Interview scheduled - ${app.title}`,
        `${app.company_name} scheduled your ${round} round on ${when} (${mode}).`,
        `/applications/${app.id}`,
      );
      return Number(lastInsertRowid);
    })();

    res.status(201).json(db.prepare(`${SELECT_INTERVIEW} WHERE iv.id = ?`).get(id));
  }),
);

/** PUT /api/interviews/:id - reschedule or record the outcome. */
router.put(
  '/:id',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare(`${SELECT_INTERVIEW} WHERE iv.id = ?`).get(id);
    if (!row) throw new HttpError(404, 'Interview not found.');
    assertCanManage(req, row);

    const b = req.body;
    db.prepare(
      `UPDATE interviews SET round=?, scheduled_at=?, mode=?, venue=?, meeting_link=?, notes=?, outcome=?
       WHERE id=?`,
    ).run(
      b.round ?? row.round,
      b.scheduled_at ?? row.scheduled_at,
      b.mode ?? row.mode,
      b.venue ?? row.venue,
      b.meeting_link ?? row.meeting_link,
      b.notes ?? row.notes,
      b.outcome ?? row.outcome,
      id,
    );

    if (b.scheduled_at && b.scheduled_at !== row.scheduled_at) {
      notify(
        row.student_id,
        `Interview rescheduled - ${row.title}`,
        `Your ${row.round} round has been moved to ${new Date(b.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        `/applications/${row.application_id}`,
      );
    }
    res.json(db.prepare(`${SELECT_INTERVIEW} WHERE iv.id = ?`).get(id));
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('recruiter', 'admin'),
  wrap((req, res) => {
    const row = db.prepare(`${SELECT_INTERVIEW} WHERE iv.id = ?`).get(Number(req.params.id));
    if (!row) throw new HttpError(404, 'Interview not found.');
    assertCanManage(req, row);
    db.prepare('DELETE FROM interviews WHERE id = ?').run(row.id);
    res.json({ ok: true });
  }),
);

export default router;
