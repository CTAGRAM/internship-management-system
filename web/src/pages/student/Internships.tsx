import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync, useDebounced } from '../../lib/useAsync';
import { date, deadlineTone, money, relative, WORK_MODE_LABEL } from '../../lib/format';
import type { Internship } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatusPill } from '../../components/StatusPill';
import {
  Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Textarea, cx, toast,
} from '../../components/ui';
import { IconBriefcase, IconLocation, IconSearch, IconClock } from '../../components/icons';

/* ------------------------------------------------------------ browse list */
export default function Internships() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');
  const [sort, setSort] = useState('match');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const search = useDebounced(q, 250);

  const { data, loading, error, reload } = useAsync(
    () => api.get<Internship[]>('/internships', { q: search, mode, sort, eligibleOnly, status: 'open' }),
    [search, mode, sort, eligibleOnly],
  );

  const list = data ?? [];
  const eligibleCount = useMemo(() => list.filter((i) => i.eligible).length, [list]);

  return (
    <>
      <PageHeader
        title="Find internships"
        description="Verified openings posted by recruiters and the placement office. Eligibility is checked against your profile automatically."
      />

      {/* Filters sit in one row above the results. */}
      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by role, skill or company"
              className="pl-9"
              aria-label="Search internships"
            />
          </div>
          <div className="flex gap-2">
            <Select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Work mode" className="w-auto">
              <option value="">All modes</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by" className="w-auto">
              <option value="match">Best match</option>
              <option value="recent">Most recent</option>
              <option value="deadline">Closing soon</option>
              <option value="stipend">Highest stipend</option>
            </Select>
          </div>
        </div>
        <label className="mt-2.5 flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            className="h-4 w-4 rounded border-line text-navy-700 focus:ring-navy-500"
          />
          Only show internships I am eligible for
          {!loading && <Badge tone="navy">{eligibleCount} eligible</Badge>}
        </label>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase className="h-8 w-8" />}
          title="No internships match those filters"
          description="Try clearing the search or widening the work mode."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((i) => <InternshipCard key={i.id} internship={i} />)}
        </div>
      )}
    </>
  );
}

function InternshipCard({ internship: i }: { internship: Internship }) {
  const tone = deadlineTone(i.deadline);
  return (
    <Link
      to={`/internships/${i.id}`}
      className="card group flex flex-col p-4 transition hover:border-navy-300 hover:shadow-lift dark:hover:border-navy-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink group-hover:text-navy-800 dark:group-hover:text-navy-200">
            {i.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-muted">
            {i.company_name}
            {i.company_verified ? <span className="ml-1 text-navy-600 dark:text-navy-400" title="Verified company">&#10003;</span> : null}
          </p>
        </div>
        {i.applicationStatus
          ? <StatusPill status={i.applicationStatus} />
          : (
            <span className={cx(
              'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
              (i.matchScore ?? 0) >= 60
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : (i.matchScore ?? 0) >= 30
                  ? 'bg-gold-50 text-gold-800 dark:bg-gold-900/50 dark:text-gold-200'
                  : 'bg-surface-sunken text-ink-muted',
            )}>
              {i.matchScore}% match
            </span>
          )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge icon={<IconLocation className="h-3 w-3" />}>{i.location || 'Remote'}</Badge>
        <Badge>{WORK_MODE_LABEL[i.work_mode]}</Badge>
        <Badge>{i.duration_months} months</Badge>
        <Badge tone="gold">{money(i.stipend)}/mo</Badge>
      </div>

      {i.skills.length > 0 && (
        <p className="mt-3 line-clamp-1 text-xs text-ink-subtle">
          {i.skills.join(' · ')}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
        <span className={cx(
          'inline-flex items-center gap-1 text-xs font-medium',
          tone === 'urgent' ? 'text-rose-600 dark:text-rose-400'
            : tone === 'soon' ? 'text-amber-700 dark:text-amber-400'
            : 'text-ink-subtle',
        )}>
          <IconClock className="h-3.5 w-3.5" />
          Closes {relative(i.deadline)}
        </span>
        {!i.eligible && !i.applicationId && (
          <Badge tone="neutral" className="max-w-[55%] truncate" >Not eligible</Badge>
        )}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------- detail page */
export function InternshipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: i, loading, error, reload } = useAsync(
    () => api.get<Internship>(`/internships/${id}`), [id],
  );

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
  if (error || !i) return <ErrorState message={error ?? 'Internship not found.'} onRetry={reload} />;

  const apply = async () => {
    setBusy(true);
    try {
      await api.post('/applications', { internship_id: i.id, cover_note: note });
      toast.success('Application submitted.');
      setApplyOpen(false);
      navigate('/applications');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not apply.');
    } finally {
      setBusy(false);
    }
  };

  const criteria = [
    ['Minimum CGPA', i.min_cgpa > 0 ? i.min_cgpa.toFixed(2) : 'No minimum'],
    ['Maximum backlogs', i.max_backlogs >= 99 ? 'No limit' : String(i.max_backlogs)],
    ['Eligible branches', i.allowed_branches.length ? i.allowed_branches.join(', ') : 'All branches'],
    ['Eligible years', i.allowed_years.length ? i.allowed_years.map((y) => `Year ${y}`).join(', ') : 'All years'],
  ] as const;

  return (
    <>
      <Link to="/internships" className="mb-4 inline-block text-sm text-ink-muted transition hover:text-ink">
        &larr; Back to internships
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{i.title}</h1>
                <p className="mt-1 text-ink-muted">
                  {i.company_name}
                  {i.company_verified ? <Badge tone="navy" className="ml-2">Verified</Badge> : null}
                </p>
              </div>
              {i.applicationStatus && <StatusPill status={i.applicationStatus} />}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge icon={<IconLocation className="h-3 w-3" />}>{i.location || 'Remote'}</Badge>
              <Badge>{WORK_MODE_LABEL[i.work_mode]}</Badge>
              <Badge>{i.duration_months} months</Badge>
              <Badge tone="gold">{money(i.stipend)}/month</Badge>
              <Badge>{i.openings} opening{i.openings > 1 ? 's' : ''}</Badge>
              <Badge tone={deadlineTone(i.deadline) === 'urgent' ? 'bad' : 'neutral'}>
                Closes {date(i.deadline)}
              </Badge>
            </div>

            {i.description && (
              <section className="mt-5">
                <h2 className="mb-1.5 text-sm font-semibold">About this role</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{i.description}</p>
              </section>
            )}

            {i.responsibilities && (
              <section className="mt-5">
                <h2 className="mb-1.5 text-sm font-semibold">What you will do</h2>
                <ul className="space-y-1.5">
                  {i.responsibilities.split('\n').filter(Boolean).map((line) => (
                    <li key={line} className="flex gap-2 text-sm text-ink-muted">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-subtle" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {i.skills.length > 0 && (
              <section className="mt-5">
                <h2 className="mb-2 text-sm font-semibold">Skills asked for</h2>
                <div className="flex flex-wrap gap-1.5">
                  {i.skills.map((s) => {
                    const have = i.matchedSkills?.includes(s);
                    return (
                      <Badge key={s} tone={have ? 'good' : 'neutral'}>
                        {have && <span aria-hidden>&#10003;</span>}{s}
                      </Badge>
                    );
                  })}
                </div>
                {i.matchedSkills && (
                  <p className="mt-2 text-xs text-ink-subtle">
                    You match {i.matchedSkills.length} of {i.skills.length} skills ({i.matchScore}%).
                    Ticked skills are on your profile.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Sticky apply panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            {i.applicationId ? (
              <>
                <p className="text-sm font-semibold text-ink">You have applied</p>
                <p className="mt-1 text-sm text-ink-muted">Track progress from your applications page.</p>
                <Link to={`/applications/${i.applicationId}`} className="mt-3 block">
                  <Button variant="secondary" className="w-full">View application</Button>
                </Link>
              </>
            ) : i.eligible ? (
              <>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  You are eligible for this role
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Your profile meets every criterion set by {i.company_name}.
                </p>
                <Button className="mt-3 w-full" size="lg" onClick={() => setApplyOpen(true)}>
                  Apply now
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">You are not eligible yet</p>
                <ul className="mt-2 space-y-1.5">
                  {(i.reasons ?? []).map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-rose-700 dark:text-rose-400">
                      <span aria-hidden>&bull;</span>{r}
                    </li>
                  ))}
                </ul>
                <Link to="/profile" className="mt-3 block">
                  <Button variant="secondary" className="w-full">Update my profile</Button>
                </Link>
              </>
            )}

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Eligibility criteria</p>
              {criteria.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-ink-muted">Applicants so far</dt>
                <dd className="font-medium text-ink">{i.application_count}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply to ${i.title}`}
        description={`${i.company_name} will see your profile, skills and resume.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={apply} loading={busy}>Submit application</Button>
          </>
        }
      >
        <Field label="Cover note" hint="Optional, but a short note on why you are a fit helps you stand out.">
          <Textarea
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="I am keen on this role because..."
          />
        </Field>
      </Modal>
    </>
  );
}
