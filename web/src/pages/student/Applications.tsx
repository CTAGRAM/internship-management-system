import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { date, dateTime, money, relative, STATUS_LABEL } from '../../lib/format';
import type { Application, ApplicationStatus } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatusPill, StatusSteps } from '../../components/StatusPill';
import {
  Badge, Button, EmptyState, ErrorState, Skeleton, Tabs, cx, toast,
} from '../../components/ui';
import { IconBriefcase, IconCheck, IconLocation, IconVideo, IconX } from '../../components/icons';

type Filter = 'all' | 'active' | 'offers' | 'closed';

const MATCHES: Record<Filter, (s: ApplicationStatus) => boolean> = {
  all: () => true,
  active: (s) => ['applied', 'shortlisted', 'interview_scheduled'].includes(s),
  offers: (s) => ['selected', 'offer_accepted'].includes(s),
  closed: (s) => ['rejected', 'offer_declined', 'completed'].includes(s),
};

export default function Applications() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, loading, error, reload } = useAsync(() => api.get<Application[]>('/applications'), []);
  const all = data ?? [];
  const shown = all.filter((a) => MATCHES[filter](a.status));

  return (
    <>
      <PageHeader
        title="My applications"
        description="Every internship you have applied to, and exactly where it stands."
      />

      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: 'all', label: 'All', count: all.length },
          { id: 'active', label: 'In progress', count: all.filter((a) => MATCHES.active(a.status)).length },
          { id: 'offers', label: 'Offers', count: all.filter((a) => MATCHES.offers(a.status)).length },
          { id: 'closed', label: 'Closed', count: all.filter((a) => MATCHES.closed(a.status)).length },
        ]}
      />

      <div className="mt-4">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconBriefcase className="h-8 w-8" />}
            title={filter === 'all' ? 'You have not applied anywhere yet' : 'Nothing in this tab'}
            description={filter === 'all' ? 'Browse the open internships and apply to the ones you are eligible for.' : undefined}
            action={filter === 'all' ? <Link to="/internships"><Button size="sm">Browse internships</Button></Link> : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {shown.map((a) => (
              <li key={a.id}>
                <Link to={`/applications/${a.id}`} className="card block p-4 transition hover:border-navy-300 hover:shadow-lift dark:hover:border-navy-600">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink">{a.title}</h3>
                      <p className="mt-0.5 text-sm text-ink-muted">{a.company_name}</p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge icon={<IconLocation className="h-3 w-3" />}>{a.location || 'Remote'}</Badge>
                    <Badge tone="gold">{money(a.stipend)}/mo</Badge>
                    <Badge>{a.duration_months} months</Badge>
                    <Badge>{a.match_score}% skill match</Badge>
                  </div>

                  <div className="mt-4"><StatusSteps status={a.status} /></div>

                  <p className="mt-3 text-xs text-ink-subtle">
                    Applied {relative(a.applied_at)} &middot; last updated {relative(a.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/* ----------------------------------------------------------- detail view */
export function ApplicationDetail() {
  const { id } = useParams();
  const [busy, setBusy] = useState('');
  const { data: a, loading, error, reload } = useAsync(
    () => api.get<Application>(`/applications/${id}`), [id],
  );

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
  if (error || !a) return <ErrorState message={error ?? 'Application not found.'} onRetry={reload} />;

  const respond = async (status: 'offer_accepted' | 'offer_declined') => {
    setBusy(status);
    try {
      await api.patch(`/applications/${a.id}/status`, { status });
      toast.success(status === 'offer_accepted' ? 'Offer accepted.' : 'Offer declined.');
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy('');
    }
  };

  const withdraw = async () => {
    if (!confirm('Withdraw this application? This cannot be undone.')) return;
    setBusy('withdraw');
    try {
      await api.del(`/applications/${a.id}`);
      toast.success('Application withdrawn.');
      window.location.href = '/applications';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not withdraw.');
      setBusy('');
    }
  };

  return (
    <>
      <Link to="/applications" className="mb-4 inline-block text-sm text-ink-muted transition hover:text-ink">
        &larr; Back to my applications
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">{a.title}</h1>
                <p className="mt-0.5 text-ink-muted">{a.company_name}</p>
              </div>
              <StatusPill status={a.status} />
            </div>
            <div className="mt-5"><StatusSteps status={a.status} /></div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <Badge icon={<IconLocation className="h-3 w-3" />}>{a.location || 'Remote'}</Badge>
              <Badge tone="gold">{money(a.stipend)}/mo</Badge>
              <Badge>{a.duration_months} months</Badge>
              <Badge>{a.match_score}% skill match</Badge>
            </div>
          </div>

          {/* Offer card */}
          {['selected', 'offer_accepted', 'offer_declined'].includes(a.status) && (
            <div className="card border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
              <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                {a.status === 'offer_accepted' ? 'Offer accepted'
                  : a.status === 'offer_declined' ? 'Offer declined'
                  : 'You have been selected'}
              </h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-muted">Stipend offered</dt>
                  <dd className="text-sm font-semibold text-ink">{money(a.offer_stipend ?? a.stipend)}/mo</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Joining date</dt>
                  <dd className="text-sm font-semibold text-ink">{date(a.offer_joining_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Duration</dt>
                  <dd className="text-sm font-semibold text-ink">{a.duration_months} months</dd>
                </div>
              </dl>
              {a.offer_note && <p className="mt-3 text-sm text-ink-muted">{a.offer_note}</p>}

              {a.status === 'selected' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => respond('offer_accepted')} loading={busy === 'offer_accepted'}
                          icon={<IconCheck className="h-4 w-4" />}>
                    Accept offer
                  </Button>
                  <Button variant="secondary" onClick={() => respond('offer_declined')}
                          loading={busy === 'offer_declined'} icon={<IconX className="h-4 w-4" />}>
                    Decline
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Interviews */}
          {(a.interviews?.length ?? 0) > 0 && (
            <section className="card">
              <header className="border-b border-line px-5 py-3">
                <h2 className="text-sm font-semibold">Interview schedule</h2>
              </header>
              <ul className="divide-y divide-line">
                {a.interviews!.map((iv) => (
                  <li key={iv.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{iv.round} round</p>
                        <p className="mt-0.5 text-sm text-ink-muted">{dateTime(iv.scheduled_at)}</p>
                      </div>
                      <Badge tone={iv.outcome === 'passed' ? 'good' : iv.outcome === 'failed' ? 'bad' : 'warn'}>
                        {iv.outcome === 'pending' ? relative(iv.scheduled_at) : iv.outcome}
                      </Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                      {iv.mode === 'online'
                        ? <><IconVideo className="h-4 w-4" /> Online</>
                        : <><IconLocation className="h-4 w-4" /> {iv.venue}</>}
                    </p>
                    {iv.notes && <p className="mt-1.5 text-sm text-ink-muted">{iv.notes}</p>}
                    {iv.mode === 'online' && iv.meeting_link && iv.outcome === 'pending' && (
                      <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener" className="mt-3 inline-block">
                        <Button size="sm" variant="secondary">Join meeting</Button>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {a.cover_note && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold">Your cover note</h2>
              <p className="whitespace-pre-line text-sm text-ink-muted">{a.cover_note}</p>
            </section>
          )}
        </div>

        {/* Timeline */}
        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Progress timeline</h2>
            <ol className="relative space-y-5 border-l border-line pl-5">
              {(a.timeline ?? []).map((e, idx, arr) => (
                <li key={e.id} className="relative">
                  <span className={cx(
                    'absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface-raised',
                    idx === arr.length - 1 ? 'bg-navy-700 dark:bg-navy-400' : 'bg-line',
                  )} />
                  <p className="text-sm font-medium text-ink">
                    {STATUS_LABEL[e.to_status] ?? e.to_status}
                  </p>
                  {e.note && <p className="mt-0.5 text-xs text-ink-muted">{e.note}</p>}
                  <p className="mt-0.5 text-[11px] text-ink-subtle">{dateTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>

          {a.status === 'applied' && (
            <Button variant="secondary" className="w-full" onClick={withdraw} loading={busy === 'withdraw'}>
              Withdraw application
            </Button>
          )}
        </aside>
      </div>
    </>
  );
}
