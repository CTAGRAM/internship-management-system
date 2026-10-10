import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { HttpError, wrap, required, notify } from '../util.js';

const router = Router();

/** GET /api/notifications - the caller's own inbox (Module 9). */
router.get(
  '/',
  requireAuth,
  wrap((req, res) => {
    const rows = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100')
      .all(req.user.id);
    res.json({ items: rows, unread: rows.filter((r) => !r.read).length });
  }),
);

router.patch(
  '/:id/read',
  requireAuth,
  wrap((req, res) => {
    const info = db
      .prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
      .run(Number(req.params.id), req.user.id);
    if (!info.changes) throw new HttpError(404, 'Notification not found.');
    res.json({ ok: true });
  }),
);

router.patch(
  '/read-all',
  requireAuth,
  wrap((req, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ ok: true });
  }),
);

// ------------------------------------------------------------ announcements
/** GET /api/notifications/announcements/all - visible to everyone. */
router.get(
  '/announcements/all',
  requireAuth,
  wrap((_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT an.*, u.name AS author FROM announcements an
           LEFT JOIN users u ON u.id = an.created_by
           ORDER BY an.created_at DESC LIMIT 50`,
        )
        .all(),
    );
  }),
);

/** POST /api/notifications/announcements - placement office broadcast. */
router.post(
  '/announcements',
  requireAuth,
  requireRole('admin'),
  wrap((req, res) => {
    required(req.body, ['title']);
    const { title, body = '', audience = 'all' } = req.body;

    const id = db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)')
        .run(String(title).trim(), body, req.user.id);

      const recipients =
        audience === 'students'
          ? db.prepare("SELECT id FROM users WHERE role = 'student'").all()
          : audience === 'recruiters'
            ? db.prepare("SELECT id FROM users WHERE role = 'recruiter'").all()
            : db.prepare('SELECT id FROM users WHERE id != ?').all(req.user.id);

      for (const r of recipients) notify(r.id, title, body, '/announcements');
      return Number(lastInsertRowid);
    })();

    res.status(201).json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(id));
  }),
);

export default router;
