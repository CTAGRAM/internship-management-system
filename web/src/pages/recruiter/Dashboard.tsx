import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { date, relative } from '../../lib/format';
import type { Application, Interview } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { FunnelChart, StatTile } from '../../components/Charts';
import { StatusPill } from '../../components/StatusPill';
import { Avatar, Badge, Button, EmptyState, Skeleton } from '../../components/ui';
import { IconBriefcase, IconPlus } from '../../components/icons';

interface RecruiterReport {
  totals: Record<string, number>;
  perPosting: {
    id: number; title: string; status: string; deadline: string; openings: number;
    applications: number; new_applications: number; selected: number;
  }[];
}

export default function RecruiterDashboard() {
  const { company } = useAuth();
  const report = useAsync(() => api.get<RecruiterReport>('/reports/recruiter'), []);
  const apps = useAsync(() => api.get<Application[]>('/applications'), []);
  const interviews = useAsync(() => api.get<Interview[]>('/interviews', { upcoming: true }), []);

  const t = report.data?.totals;
  const recent = (apps.data ?? []).slice(0, 6);

  const funnel = [
    { stage: 'Applied', count: t?.applications ?? 0 },
    { stage: 'Shortlisted', count: t?.shortlisted ?? 0 },
    { stage: 'Interviewed', count: t?.interviews ?? 0 },
    { stage: 'Selected', count: t?.selected ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title={company?.name ?? 'Recruiter dashboard'}
        description="Your postings, applicants and interview schedule."
        actions={<Link to="/postings"><Button icon={<IconPlus className="h-4 w-4" />}>New posting</Button></Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {report.loading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
          : (
            <>
              <StatTile label="Open postings" value={t?.openInternships ?? 0} sub={`${t?.internships ?? 0} total`} />
              <StatTile label="Applications" value={t?.applications ?? 0} sub="received" tone="navy" />
              <StatTile label="Shortlisted" value={t?.shortlisted ?? 0} sub="in progress" tone="gold" />
              <StatTile label="Selected" value={t?.selected ?? 0} sub="offers made" tone="good" />
            </>
          )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Hiring funnel</h2>
          {report.loading ? <Skeleton className="h-44" /> : <FunnelChart data={funnel} />}
        </section>

        <section className="card">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Upcoming interviews</h2>
          </header>
          {interviews.loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (interviews.data ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-subtle">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-line">
              {interviews.data!.slice(0, 5).map((iv) => (
                <li key={iv.id} className="flex items-center gap-2.5 px-4 py-3">
                  <Avatar name={iv.student_name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{iv.student_name}</p>
                    <p className="truncate text-xs text-ink-subtle">{iv.round} &middot; {iv.title}</p>
                  </div>
                  <Badge tone="warn">{relative(iv.scheduled_at)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Per posting */}
        <section className="card">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Postings</h2>
            <Link to="/postings" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              Manage
            </Link>
          </header>
          {report.loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (report.data?.perPosting ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<IconBriefcase className="h-8 w-8" />}
                title="No postings yet"
                action={<Link to="/postings"><Button size="sm">Create one</Button></Link>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {report.data!.perPosting.map((p) => (
                <li key={p.id}>
                  <Link to={`/pipeline/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-sunken">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                      <p className="text-xs text-ink-subtle">
                        {p.openings} opening{p.openings > 1 ? 's' : ''} &middot; closes {date(p.deadline)}
                      </p>
                    </div>
                    {p.new_applications > 0 && <Badge tone="info">{p.new_applications} new</Badge>}
                    <span className="text-sm font-semibold tabular-nums text-ink">{p.applications}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent applicants */}
        <section className="card">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Latest applicants</h2>
            <Link to="/candidates" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              View all
            </Link>
          </header>
          {apps.loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-subtle">No applications yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link to={`/pipeline/${a.internship_id}`} className="flex items-center gap-2.5 px-4 py-3 transition hover:bg-surface-sunken">
                    <Avatar name={a.student_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.student_name}</p>
                      <p className="truncate text-xs text-ink-subtle">
                        {a.title} &middot; {a.match_score}% match
                      </p>
                    </div>
                    <StatusPill status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
