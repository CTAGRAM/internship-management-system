import { db, parseJson } from './db.js';

/** Throwable HTTP error so routes can `throw new HttpError(400, '...')`. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wraps an async route so rejected promises reach the error handler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function required(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
}

const norm = (s) => String(s).trim().toLowerCase();

/**
 * Module 4 - Eligibility & Recommendation.
 *
 * Checks a student against an internship's criteria and scores how well their
 * skills overlap with the ones asked for. Returns the individual reasons too,
 * so the UI can tell the student exactly *why* they are not eligible.
 */
export function evaluateEligibility(student, internship) {
  const reasons = [];
  const required = parseJson(internship.allowed_branches);
  const years = parseJson(internship.allowed_years);

  if (student.cgpa < internship.min_cgpa) {
    reasons.push(`Requires CGPA ${internship.min_cgpa.toFixed(2)} (yours is ${student.cgpa.toFixed(2)})`);
  }
  if (student.backlogs > internship.max_backlogs) {
    reasons.push(
      internship.max_backlogs === 0
        ? 'Requires zero active backlogs'
        : `Allows at most ${internship.max_backlogs} backlog(s), you have ${student.backlogs}`,
    );
  }
  if (required.length && !required.map(norm).includes(norm(student.branch))) {
    reasons.push(`Open to ${required.join(', ')} only`);
  }
  if (years.length && !years.map(Number).includes(Number(student.year))) {
    reasons.push(`Open to year ${years.join(', ')} only`);
  }
  if (internship.status !== 'open') reasons.push('This posting is closed');
  if (isPast(internship.deadline)) reasons.push('The application deadline has passed');

  return {
    eligible: reasons.length === 0,
    reasons,
    matchScore: skillMatchScore(student, internship),
    matchedSkills: matchedSkills(student, internship),
  };
}

/** Percentage of the internship's required skills that the student lists. */
export function skillMatchScore(student, internship) {
  const wanted = parseJson(internship.skills).map(norm);
  if (!wanted.length) return 100;
  const have = new Set(parseJson(student.skills).map(norm));
  const hits = wanted.filter((s) => have.has(s)).length;
  return Math.round((hits / wanted.length) * 100);
}

export function matchedSkills(student, internship) {
  const have = new Set(parseJson(student.skills).map(norm));
  return parseJson(internship.skills).filter((s) => have.has(norm(s)));
}

/** True when a YYYY-MM-DD date is strictly before today. */
export function isPast(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return String(dateStr).slice(0, 10) < today;
}

/** Module 9 - drop an in-app notification for a user. */
export function notify(userId, title, body = '', link = '') {
  if (!userId) return;
  db.prepare(
    'INSERT INTO notifications (user_id, title, body, link) VALUES (?, ?, ?, ?)',
  ).run(userId, title, body, link);
}

/** Records a status change on an application and notifies the student. */
export function logStatusChange({ applicationId, from, to, note = '', actorId = null }) {
  db.prepare(
    `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(applicationId, from, to, note, actorId);
}

export const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  selected: 'Selected',
  rejected: 'Not selected',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  completed: 'Internship completed',
};

/** Turns an array of objects into a CSV string for report download. */
export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}
