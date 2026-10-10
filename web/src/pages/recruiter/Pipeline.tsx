import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getToken } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { date, relative } from '../../lib/format';
import type { ApplicationStatus, Candidate, Internship } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatusPill } from '../../components/StatusPill';
import {
  Avatar, Badge, Button, EmptyState, ErrorState, Field, Input, Modal,
  Select, Skeleton, Textarea, cx, toast,
} from '../../components/ui';
import { IconCheck, IconDownload, IconUsers, IconX } from '../../components/icons';

/**
 * The shortlisting board (Module 6). Candidates sit in columns by pipeline
 * stage and are dragged -- or moved with the buttons -- to the next stage.
 */
const COLUMNS: { id: ApplicationStatus; label: string; accent: string }[] = [
  { id: 'applied', label: 'Applied', accent: 'bg-sky-500' },
  { id: 'shortlisted', label: 'Shortlisted', accent: 'bg-navy-500' },
  { id: 'interview_scheduled', label: 'Interview', accent: 'bg-amber-500' },
  { id: 'selected', label: 'Selected', accent: 'bg-emerald-500' },
  { id: 'rejected', label: 'Not selected', accent: 'bg-rose-500' },
];

export default function Pipeline() {
  const { id } = useParams();
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<ApplicationStatus | null>(null);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [scheduling, setScheduling] = useState<Candidate | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => api.get<{ internship: Internship; candidates: Candidate[] }>(`/internships/${id}/candidates`),
    [id],
  );

  const move = async (candidate: Candidate, status: ApplicationStatus) => {
    if (candidate.status === status) return;
    // Scheduling an interview needs date/venue details, so route through the form.
    if (status === 'interview_scheduled') { setScheduling(candidate); return; }
    try {
      await api.patch(`/applications/${candidate.id}/status`, { status });
      toast.success(`${candidate.name} moved to ${COLUMNS.find((c) => c.id === status)?.label}.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    }
  };

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  }
  if (error || !data) return <ErrorState message={error ?? 'Not found.'} onRetry={reload} />;

  const { internship, candidates } = data;
  const byStatus = (s: ApplicationStatus) =>
    candidates.filter((c) =>
      s === 'selected'
        ? ['selected', 'offer_accepted', 'completed'].includes(c.status)
        : s === 'rejected'
          ? ['rejected', 'offer_declined'].includes(c.status)
          : c.status === s,
    );

  return (
    <>
      <Link to="/postings" className="mb-4 inline-block text-sm text-ink-muted transition hover:text-ink">
        &larr; Back to postings
      </Link>

      <PageHeader
        title={internship.title}
        description={`${candidates.length} applicant${candidates.length === 1 ? '' : 's'} · ${internship.openings} opening${internship.openings > 1 ? 's' : ''} · closes ${date(internship.deadline)}`}
      />

      {candidates.length === 0 ? (
        <EmptyState
          icon={<IconUsers className="h-8 w-8" />}
          title="No applications yet"
          description="Eligible students are notified when a posting goes live. They will appear here as they apply."
        />
      ) : (
        <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3">
            {COLUMNS.map((col) => {
              const items = byStatus(col.id);
              return (
                <section
                  key={col.id}
                  onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => {
                    setOver(null);
                    const c = candidates.find((x) => x.id === dragging);
                    if (c) void move(c, col.id);
                    setDragging(null);
                  }}
                  className={cx(
                    'flex w-[17rem] shrink-0 flex-col rounded-xl border bg-surface-sunken/60 transition',
                    over === col.id ? 'border-navy-400 bg-navy-50/60 dark:bg-navy-900/40' : 'border-line',
                  )}
                >
                  <header className="flex items-center gap-2 px-3 py-2.5">
                    <span className={cx('h-2 w-2 rounded-full', col.accent)} />
                    <h2 className="text-sm font-semibold text-ink">{col.label}</h2>
                    <span className="ml-auto rounded-md bg-surface-raised px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-muted">
                      {items.length}
                    </span>
                  </header>

                  <ul className="flex-1 space-y-2 p-2 pt-0">
                    {items.length === 0 && (
                      <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-subtle">
                        Drop a candidate here
                      </li>
                    )}
                    {items.map((c) => (
                      <li
                        key={c.id}
                        draggable
                        onDragStart={() => setDragging(c.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cx(
                          'cursor-grab rounded-lg border border-line bg-surface-raised p-3 shadow-card transition active:cursor-grabbing',
                          dragging === c.id && 'opacity-40',
                        )}
                      >
                        <button onClick={() => setDetail(c)} className="w-full text-left">
                          <div className="flex items-start gap-2.5">
                            <Avatar name={c.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                              <p className="truncate text-xs text-ink-subtle">
                                {c.branch} &middot; CGPA {c.cgpa.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className={cx(
                              'rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                              c.match_score >= 60
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-surface-sunken text-ink-muted',
                            )}>
                              {c.match_score}% match
                            </span>
                            <span className="text-[11px] text-ink-subtle">{relative(c.applied_at)}</span>
                          </div>
                        </button>

                        {/* Keyboard/touch alternative to dragging. */}
                        {col.id !== 'selected' && col.id !== 'rejected' && (
                          <div className="mt-2.5 flex gap-1.5 border-t border-line pt-2.5">
                            <Button
                              size="sm" variant="secondary" className="flex-1"
                              onClick={() => void move(c, COLUMNS[COLUMNS.findIndex((x) => x.id === col.id) + 1].id)}
                            >
                              <IconCheck className="h-3.5 w-3.5" /> Advance
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => void move(c, 'rejected')}
                              aria-label={`Reject ${c.name}`}
                            >
                              <IconX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {detail && (
        <CandidateModal
          candidate={detail}
          internship={internship}
          onClose={() => setDetail(null)}
          onMove={(s) => { void move(detail, s); setDetail(null); }}
        />
      )}

      {scheduling && (
        <ScheduleModal
          candidate={scheduling}
          workMode={internship.work_mode}
          onClose={() => setScheduling(null)}
          onDone={async () => { setScheduling(null); await reload(); }}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------- candidate card */
function CandidateModal({
  candidate: c, internship, onClose, onMove,
}: {
  candidate: Candidate; internship: Internship; onClose: () => void;
  onMove: (s: ApplicationStatus) => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={c.name}
      description={`${c.enrollment_no} · ${c.branch} ${c.division} · Year ${c.year}`}
      width="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onMove('rejected')}>Not selected</Button>
          {c.status === 'applied' && <Button onClick={() => onMove('shortlisted')}>Shortlist</Button>}
          {c.status === 'shortlisted' && <Button onClick={() => onMove('interview_scheduled')}>Schedule interview</Button>}
          {c.status === 'interview_scheduled' && <Button onClick={() => onMove('selected')}>Select candidate</Button>}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={c.status} />
          <Badge tone={c.match_score >= 60 ? 'good' : 'neutral'}>{c.match_score}% skill match</Badge>
          <Badge tone={c.backlogs === 0 ? 'good' : 'warn'}>
            {c.backlogs === 0 ? 'No backlogs' : `${c.backlogs} backlog(s)`}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['CGPA', c.cgpa.toFixed(2)],
            ['Branch', c.branch],
            ['Year', `Year ${c.year}`],
            ['Applied', relative(c.applied_at)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.skills.length === 0 && <p className="text-sm text-ink-subtle">No skills listed.</p>}
            {c.skills.map((s) => (
              <Badge key={s} tone={c.matchedSkills.includes(s) ? 'good' : 'neutral'}>
                {c.matchedSkills.includes(s) && <span aria-hidden>&#10003;</span>}{s}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Ticked skills are ones this posting asked for ({c.matchedSkills.length} of {internship.skills.length}).
          </p>
        </section>

        {c.cover_note && (
          <section>
            <h3 className="mb-1.5 text-sm font-semibold">Cover note</h3>
            <p className="whitespace-pre-line text-sm text-ink-muted">{c.cover_note}</p>
          </section>
        )}

        <section className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <a href={`mailto:${c.email}`} className="text-sm text-navy-700 hover:underline dark:text-navy-300">
            {c.email}
          </a>
          {c.phone && <span className="text-sm text-ink-muted">{c.phone}</span>}
          {c.hasResume && (
            <Button
              size="sm" variant="secondary" icon={<IconDownload className="h-4 w-4" />}
              onClick={async () => {
                const res = await fetch(`/api/students/${c.student_id}/resume`, {
                  headers: { Authorization: `Bearer ${getToken()}` },
                });
                window.open(URL.createObjectURL(await res.blob()), '_blank');
              }}
            >
              Resume
            </Button>
          )}
        </section>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------- interview scheduler */
export function ScheduleModal({
  candidate, workMode, onClose, onDone,
}: {
  candidate: Candidate; workMode: string; onClose: () => void; onDone: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    round: 'Technical',
    scheduled_at: '',
    mode: workMode === 'onsite' ? 'offline' : 'online',
    venue: '',
    meeting_link: '',
    notes: 'Please join five minutes early with a copy of your resume.',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/interviews', { application_id: candidate.id, ...form });
      toast.success(`Interview scheduled with ${candidate.name}.`);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not schedule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule interview"
      description={`${candidate.name} will be notified immediately.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!form.scheduled_at}>Schedule</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Round">
            <Select value={form.round} onChange={(e) => set('round', e.target.value)}>
              {['Technical', 'HR', 'Managerial', 'Aptitude', 'Final'].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Date and time" required>
            <Input type="datetime-local" value={form.scheduled_at}
                   onChange={(e) => set('scheduled_at', e.target.value)} />
          </Field>
        </div>

        <Field label="Mode">
          <Select value={form.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="online">Online</option>
            <option value="offline">In person</option>
          </Select>
        </Field>

        {form.mode === 'online' ? (
          <Field label="Meeting link" required>
            <Input value={form.meeting_link} onChange={(e) => set('meeting_link', e.target.value)}
                   placeholder="https://meet.google.com/..." />
          </Field>
        ) : (
          <Field label="Venue" required>
            <Input value={form.venue} onChange={(e) => set('venue', e.target.value)}
                   placeholder="Campus Placement Cell, Block B" />
          </Field>
        )}

        <Field label="Instructions for the candidate">
          <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
