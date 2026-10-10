import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, companyIdFor } from '../auth.js';
import { wrap, toCsv, STATUS_LABELS } from '../util.js';

const router = Router();

const PLACED = "('selected','offer_accepted','completed')";
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);

/**
 * GET /api/reports/summary
 * Module 10 - the placement officer's dashboard numbers.
 */
router.get(
  '/summary',
  requireAuth,
  requireRole('admin'),
  wrap((_req, res) => {
    const students = one('SELECT COUNT(*) n FROM students').n;
    const applied = one('SELECT COUNT(DISTINCT student_id) n FROM applications').n;
    const placed = one(`SELECT COUNT(DISTINCT student_id) n FROM applications WHERE status IN ${PLACED}`).n;

    res.json({
      totals: {
        students,
        companies: one('SELECT COUNT(*) n FROM companies').n,
        internships: one('SELECT COUNT(*) n FROM internships').n,
        openInternships: one("SELECT COUNT(*) n FROM internships WHERE status = 'open'").n,
        applications: one('SELECT COUNT(*) n FROM applications').n,
        shortlisted: one("SELECT COUNT(*) n FROM applications WHERE status = 'shortlisted'").n,
        interviews: one('SELECT COUNT(*) n FROM interviews').n,
        selected: one(`SELECT COUNT(*) n FROM applications WHERE status IN ${PLACED}`).n,
        studentsApplied: applied,
        studentsPlaced: placed,
        placementRate: students ? Math.round((placed / students) * 100) : 0,
        participationRate: students ? Math.round((applied / students) * 100) : 0,
        openings: one("SELECT COALESCE(SUM(openings),0) n FROM internships WHERE status='open'").n,
        avgStipend: Math.round(
          one("SELECT COALESCE(AVG(stipend),0) n FROM internships WHERE stipend > 0").n,
        ),
      },

      // Funnel across the whole pipeline (Applied -> Shortlisted -> Interview -> Selected).
      funnel: [
        { stage: 'Applied', count: one('SELECT COUNT(*) n FROM applications').n },
        {
          stage: 'Shortlisted',
          count: one(
            `SELECT COUNT(*) n FROM applications WHERE status IN
             ('shortlisted','interview_scheduled','selected','offer_accepted','completed')`,
          ).n,
        },
        {
          stage: 'Interviewed',
          count: one(
            `SELECT COUNT(*) n FROM applications WHERE status IN
             ('interview_scheduled','selected','offer_accepted','completed')`,
          ).n,
        },
        { stage: 'Selected', count: one(`SELECT COUNT(*) n FROM applications WHERE status IN ${PLACED}`).n },
      ],

      byStatus: all('SELECT status, COUNT(*) count FROM applications GROUP BY status ORDER BY count DESC')
        .map((r) => ({ ...r, label: STATUS_LABELS[r.status] ?? r.status })),

      byBranch: all(
        `SELECT s.branch,
                COUNT(DISTINCT s.user_id) students,
                COUNT(DISTINCT a.student_id) applied,
                COUNT(DISTINCT CASE WHEN a.status IN ${PLACED} THEN a.student_id END) placed
         FROM students s LEFT JOIN applications a ON a.student_id = s.user_id
         GROUP BY s.branch ORDER BY students DESC`,
      ),

      byCompany: all(
        `SELECT c.name AS company,
                COUNT(DISTINCT i.id) internships,
                COUNT(a.id) applications,
                COUNT(CASE WHEN a.status IN ${PLACED} THEN 1 END) selected
         FROM companies c
         LEFT JOIN internships  i ON i.company_id = c.id
         LEFT JOIN applications a ON a.internship_id = i.id
         GROUP BY c.id ORDER BY applications DESC, c.name LIMIT 12`,
      ),

      topSkills: topSkills(),

      recentActivity: all(
        `SELECT e.to_status, e.created_at, u.name AS student_name, i.title, c.name AS company_name
         FROM application_events e
         JOIN applications a ON a.id = e.application_id
         JOIN internships  i ON i.id = a.internship_id
         JOIN companies    c ON c.id = i.company_id
         JOIN users        u ON u.id = a.student_id
         ORDER BY e.created_at DESC, e.id DESC LIMIT 12`,
      ).map((r) => ({ ...r, label: STATUS_LABELS[r.to_status] ?? r.to_status })),

      applicationsOverTime: all(
        `SELECT substr(applied_at, 1, 10) AS day, COUNT(*) count
         FROM applications GROUP BY day ORDER BY day ASC LIMIT 60`,
      ),
    });
  }),
);

/** Most-requested skills across open postings, so the office can plan training. */
function topSkills() {
  const counts = new Map();
  for (const row of all("SELECT skills FROM internships WHERE status = 'open'")) {
    let list = [];
    try { list = JSON.parse(row.skills) || []; } catch { list = []; }
    for (const skill of list) {
      const key = String(skill).trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/** GET /api/reports/recruiter - the numbers a company cares about. */
router.get(
  '/recruiter',
  requireAuth,
  requireRole('recruiter'),
  wrap((req, res) => {
    const cid = companyIdFor(req.user.id) ?? -1;
    res.json({
      totals: {
        internships: one('SELECT COUNT(*) n FROM internships WHERE company_id = ?', cid).n,
        openInternships: one("SELECT COUNT(*) n FROM internships WHERE company_id = ? AND status='open'", cid).n,
        applications: one(
          'SELECT COUNT(*) n FROM applications a JOIN internships i ON i.id=a.internship_id WHERE i.company_id = ?',
          cid,
        ).n,
        shortlisted: one(
          `SELECT COUNT(*) n FROM applications a JOIN internships i ON i.id=a.internship_id
           WHERE i.company_id = ? AND a.status IN ('shortlisted','interview_scheduled')`,
          cid,
        ).n,
        interviews: one(
          `SELECT COUNT(*) n FROM interviews iv
           JOIN applications a ON a.id=iv.application_id
           JOIN internships  i ON i.id=a.internship_id WHERE i.company_id = ?`,
          cid,
        ).n,
        selected: one(
          `SELECT COUNT(*) n FROM applications a JOIN internships i ON i.id=a.internship_id
           WHERE i.company_id = ? AND a.status IN ${PLACED}`,
          cid,
        ).n,
      },
      perPosting: all(
        `SELECT i.id, i.title, i.status, i.deadline, i.openings,
                COUNT(a.id) applications,
                COUNT(CASE WHEN a.status='applied' THEN 1 END) new_applications,
                COUNT(CASE WHEN a.status IN ${PLACED} THEN 1 END) selected
         FROM internships i LEFT JOIN applications a ON a.internship_id = i.id
         WHERE i.company_id = ? GROUP BY i.id ORDER BY i.created_at DESC`,
        cid,
      ),
    });
  }),
);

/** GET /api/reports/student - the student's own snapshot. */
router.get(
  '/student',
  requireAuth,
  requireRole('student'),
  wrap((req, res) => {
    const id = req.user.id;
    res.json({
      totals: {
        applications: one('SELECT COUNT(*) n FROM applications WHERE student_id = ?', id).n,
        shortlisted: one(
          `SELECT COUNT(*) n FROM applications WHERE student_id = ?
           AND status IN ('shortlisted','interview_scheduled','selected','offer_accepted','completed')`,
          id,
        ).n,
        interviews: one(
          `SELECT COUNT(*) n FROM interviews iv JOIN applications a ON a.id=iv.application_id
           WHERE a.student_id = ?`,
          id,
        ).n,
        offers: one(`SELECT COUNT(*) n FROM applications WHERE student_id = ? AND status IN ${PLACED}`, id).n,
      },
      byStatus: all(
        'SELECT status, COUNT(*) count FROM applications WHERE student_id = ? GROUP BY status',
        id,
      ).map((r) => ({ ...r, label: STATUS_LABELS[r.status] ?? r.status })),
    });
  }),
);

/** GET /api/reports/export/:kind.csv - downloadable placement records. */
router.get(
  '/export/:kind',
  requireAuth,
  requireRole('admin'),
  wrap((req, res) => {
    const kind = String(req.params.kind).replace(/\.csv$/, '');
    const queries = {
      applications: `
        SELECT u.name AS student, s.enrollment_no, s.branch, s.division, s.cgpa,
               c.name AS company, i.title AS internship, a.status, a.match_score,
               a.applied_at, a.updated_at
        FROM applications a
        JOIN students s   ON s.user_id = a.student_id
        JOIN users u      ON u.id = s.user_id
        JOIN internships i ON i.id = a.internship_id
        JOIN companies c  ON c.id = i.company_id
        ORDER BY a.applied_at DESC`,
      students: `
        SELECT s.enrollment_no, u.name, u.email, s.branch, s.division, s.year,
               s.cgpa, s.backlogs, s.phone, s.skills
        FROM students s JOIN users u ON u.id = s.user_id ORDER BY u.name`,
      placements: `
        SELECT u.name AS student, s.enrollment_no, s.branch, c.name AS company,
               i.title AS internship, a.status, a.offer_stipend, a.offer_joining_date
        FROM applications a
        JOIN students s    ON s.user_id = a.student_id
        JOIN users u       ON u.id = s.user_id
        JOIN internships i ON i.id = a.internship_id
        JOIN companies c   ON c.id = i.company_id
        WHERE a.status IN ${PLACED} ORDER BY c.name, u.name`,
      internships: `
        SELECT c.name AS company, i.title, i.location, i.work_mode, i.stipend,
               i.duration_months, i.openings, i.min_cgpa, i.deadline, i.status,
               (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applications
        FROM internships i JOIN companies c ON c.id = i.company_id ORDER BY i.created_at DESC`,
    };

    const sql = queries[kind];
    if (!sql) return res.status(404).json({ error: 'Unknown report.' });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(toCsv(all(sql)));
  }),
);

export default router;
