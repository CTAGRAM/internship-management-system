import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { date, dateTime, money, relative } from '../../lib/format';
import type { Application, Internship, Interview } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatTile } from '../../components/Charts';
import { StatusPill, StatusSteps } from '../../components/StatusPill';
import { Badge, Button, EmptyState, Progress, Skeleton, cx } from '../../components/ui';
import { IconBriefcase, IconCalendar, IconLocation, IconSparkle, IconVideo } from '../../components/icons';

/** How complete the student's profile is, and what is still missing. */
function profileCompletion(s: ReturnType<typeof useAuth>['student']) {
  if (!s) return { pct: 0, missing: [] as string[] };
  const checks: [string, boolean][] = [
    ['Phone number', Boolean(s.phone)],
    ['CGPA', s.cgpa > 0],
    ['Skills', s.skills.length >= 3],
    ['A short bio', Boolean(s.bio)],
    ['At least one project', s.projects.length > 0],
    ['Resume', s.hasResume],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

export default function StudentDashboard() {
  const { user, student } = useAuth();
  const stats = useAsync(() => api.get<{ totals: Record<string, number> }>('/reports/student'), []);
  const apps = useAsync(() => api.get<Application[]>('/applications'), []);
  const recs = useAsync(() => api.get<Internship[]>('/internships', { sort: 'match', eligibleOnly: true }), []);
  const interviews = useAsync(() => api.get<Interview[]>('/interviews', { upcoming: true }), []);

  const { pct, missing } = profileCompletion(student);
  const active = (apps.data ?? []).filter((a) => !['rejected', 'offer_declined'].includes(a.status));
  const recommended = (recs.data ?? []).filter((r) => !r.applicationId).slice(0, 4);
  const nextInterview = interviews.data?.[0];
  const t = stats.data?.totals;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        description="Your internship applications, interviews and recommendations at a glance."
        actions={
          <Link to="/internships">
            <Button icon={<IconSparkle className="h-4 w-4" />}>Find internships</Button>
          </Link>
        }
      />

      {/* Profile completion nudge */}
      {pct < 100 && (
        <div className="card mb-5 border-gold-200 bg-gold-50/60 p-4 dark:border-gold-800 dark:bg-gold-900/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Your profile is {pct}% complete</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Still to add: {missing.join(', ')}. Recruiters rank complete profiles higher.
              </p>
            </div>
            <Link to="/profile" className="shrink-0">
              <Button variant="gold" size="sm">Complete profile</Button>
            </Link>
          </div>
          <div className="mt-3"><Progress value={pct} tone="gold" /></div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.loading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
          : (
            <>
              <StatTile label="Applications" value={t?.applications ?? 0} sub="submitted in total" />
              <StatTile label="Shortlisted" value={t?.shortlisted ?? 0} sub="moved past review" tone="navy" />
              <StatTile label="Interviews" value={t?.interviews ?? 0} sub="scheduled or done" tone="gold" />
              <StatTile label="Offers" value={t?.offers ?? 0} sub="selections received" tone="good" />
            </>
          )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Active applications */}
        <section className="card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Active applications</h2>
            <Link to="/applications" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              View all
            </Link>
          </header>

          {apps.loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<IconBriefcase className="h-8 w-8" />}
                title="No active applications"
                description="Browse the verified openings and apply to the ones you are eligible for."
                action={<Link to="/internships"><Button size="sm">Browse internships</Button></Link>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {active.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/applications/${a.id}`} className="block px-4 py-3.5 transition hover:bg-surface-sunken">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {a.company_name} &middot; applied {relative(a.applied_at)}
                        </p>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="mt-3"><StatusSteps status={a.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          {/* Next interview */}
          <section className="card overflow-hidden">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Next interview</h2>
            </header>
            {interviews.loading ? (
              <div className="p-4"><Skeleton className="h-20" /></div>
            ) : !nextInterview ? (
              <p className="px-4 py-6 text-center text-sm text-ink-subtle">Nothing scheduled yet.</p>
            ) : (
              <div className="p-4">
                <Badge tone="warn" icon={<IconCalendar className="h-3 w-3" />}>
                  {relative(nextInterview.scheduled_at)}
                </Badge>
                <p className="mt-2.5 text-sm font-semibold text-ink">{nextInterview.title}</p>
                <p className="text-xs text-ink-muted">{nextInterview.company_name} &middot; {nextInterview.round} round</p>
                <p className="mt-2 text-sm text-ink">{dateTime(nextInterview.scheduled_at)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  {nextInterview.mode === 'online'
                    ? <><IconVideo className="h-3.5 w-3.5" /> Online interview</>
                    : <><IconLocation className="h-3.5 w-3.5" /> {nextInterview.venue}</>}
                </p>
                {nextInterview.mode === 'online' && nextInterview.meeting_link && (
                  <a href={nextInterview.meeting_link} target="_blank" rel="noreferrer noopener" className="mt-3 block">
                    <Button size="sm" variant="secondary" className="w-full">Join meeting</Button>
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section className="card">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Recommended for you</h2>
              <Badge tone="navy">Eligible</Badge>
            </header>
            {recs.loading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : recommended.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-subtle">
                No new matches. Add more skills to your profile to widen your matches.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recommended.map((i) => (
                  <li key={i.id}>
                    <Link to={`/internships/${i.id}`} className="block px-4 py-3 transition hover:bg-surface-sunken">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-ink">{i.title}</p>
                        <span className={cx(
                          'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                          (i.matchScore ?? 0) >= 60
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-surface-sunken text-ink-muted',
                        )}>
                          {i.matchScore}% match
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {i.company_name} &middot; {money(i.stipend)}/mo
                      </p>
                      <p className="mt-1 text-[11px] text-ink-subtle">Closes {date(i.deadline)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
