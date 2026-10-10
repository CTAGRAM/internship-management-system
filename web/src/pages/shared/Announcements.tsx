import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { dateTime } from '../../lib/format';
import type { Announcement } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import {
  Button, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Textarea, toast,
} from '../../components/ui';
import { IconMegaphone, IconPlus } from '../../components/icons';

export default function Announcements() {
  const { user } = useAuth();
  const [composing, setComposing] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => api.get<Announcement[]>('/notifications/announcements/all'), [],
  );
  const items = data ?? [];
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Notices from the Training &amp; Placement cell."
        actions={isAdmin && (
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setComposing(true)}>
            New announcement
          </Button>
        )}
      />

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<IconMegaphone className="h-8 w-8" />} title="No announcements yet" />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700 dark:bg-gold-900/50 dark:text-gold-300">
                  <IconMegaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">{a.title}</h2>
                  {a.body && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{a.body}</p>}
                  <p className="mt-2.5 text-xs text-ink-subtle">
                    {a.author ?? 'Placement Cell'} &middot; {dateTime(a.created_at)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {composing && <Compose onClose={() => setComposing(false)}
                             onSent={async () => { setComposing(false); await reload(); }} />}
    </>
  );
}

function Compose({ onClose, onSent }: { onClose: () => void; onSent: () => void | Promise<void> }) {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!form.title.trim()) { toast.error('A title is required.'); return; }
    setBusy(true);
    try {
      await api.post('/notifications/announcements', form);
      toast.success('Announcement sent.');
      await onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open onClose={onClose}
      title="New announcement"
      description="Everyone in the selected audience gets a notification."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} loading={busy}>Send announcement</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                 placeholder="Resume review workshop on Friday" />
        </Field>
        <Field label="Message">
          <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Details, venue, timing and who should attend." />
        </Field>
        <Field label="Audience">
          <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            <option value="all">Everyone</option>
            <option value="students">Students only</option>
            <option value="recruiters">Recruiters only</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
