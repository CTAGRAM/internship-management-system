import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { money, relative } from '../../lib/format';
import type { AdminSummary } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { BarList, FunnelChart, GroupedBars, SERIES, StatTile, TrendArea } from '../../components/Charts';
import { Badge, Button, ErrorState, Skeleton } from '../../components/ui';
import { IconDownload, IconMegaphone } from '../../components/icons';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => api.get<AdminSummary>('/reports/summary'), []);

  if (loading) {
    return (
      <>
        <PageHeader title="Placement overview" description="Loading..." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)}
        </div>
      </>
    );
  }
  if (error || !data) return <ErrorState message={error ?? 'Could not load reports.'} onRetry={reload} />;

  const t = data.totals;

  return (
    <>
      <PageHeader
        title="Placement overview"
        description="Participation, pipeline health and outcomes across the department."
        actions={
          <>
            <Link to="/announcements">
              <Button variant="secondary" icon={<IconMegaphone className="h-4 w-4" />}>Announce</Button>
            </Link>
            <Link to="/admin/reports">
              <Button icon={<IconDownload className="h-4 w-4" />}>Reports</Button>
            </Link>
          </>
        }
      />

      {/* Headline numbers */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Registered students" value={t.students} sub={`${t.participationRate}% have applied`} />
        <StatTile label="Placement rate" value={`${t.placementRate}%`}
                  sub={`${t.studentsPlaced} of ${t.students} students`} tone="good" />
        <StatTile label="Partner companies" value={t.companies} sub={`${t.openInternships} open postings`} tone="navy" />
        <StatTile label="Average stipend" value={money(t.avgStipend)} sub="per month, paid roles" tone="gold" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Applications" value={t.applications} tone="plain" />
        <StatTile label="Shortlisted" value={t.shortlisted} tone="plain" />
        <StatTile label="Interviews held" value={t.interviews} tone="plain" />
        <StatTile label="Seats available" value={t.openings} tone="plain" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Funnel */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Placement funnel</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink-muted">
            Conversion from application through to selection.
          </p>
          <FunnelChart data={data.funnel} />
        </section>

        {/* By branch */}
        <section className="card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold">Participation by branch</h2>
          <p className="mb-3 mt-0.5 text-xs text-ink-muted">
            Registered students against those who applied and were placed.
          </p>
          <GroupedBars
            rows={data.byBranch as unknown as Record<string, string | number>[]}
            categoryKey="branch"
            series={[
              { key: 'students', label: 'Registered', color: SERIES.s1 },
              { key: 'applied', label: 'Applied', color: SERIES.s2 },
              { key: 'placed', label: 'Placed', color: SERIES.s3 },
            ]}
          />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Most requested skills</h2>
          <p className="mb-4 text-xs text-ink-muted">Across open postings. Useful for planning training.</p>
          <BarList items={data.topSkills.map((s) => ({ label: s.skill, value: s.count }))} valueLabel="roles" />
        </section>

        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Applications by stage</h2>
          <p className="mb-4 text-xs text-ink-muted">Where every application currently sits.</p>
          <BarList
            items={data.byStatus.map((s) => ({ label: s.label, value: s.count }))}
            tone={SERIES.s1}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Recent activity</h2>
          <p className="mb-3 text-xs text-ink-muted">The latest pipeline movements.</p>
          <ul className="space-y-2.5">
            {data.recentActivity.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-subtle">Nothing yet.</li>
            )}
            {data.recentActivity.slice(0, 8).map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-400" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink">{a.student_name}</span>
                  <span className="text-ink-muted"> &rarr; {a.label.toLowerCase()} for </span>
                  <span className="text-ink">{a.title}</span>
                  <span className="block text-[11px] text-ink-subtle">
                    {a.company_name} &middot; {relative(a.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-1 text-sm font-semibold">Applications over time</h2>
          <p className="mb-3 text-xs text-ink-muted">Daily volume submitted through the portal.</p>
          <TrendArea data={data.applicationsOverTime} />
        </section>

        <section className="card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-semibold">Top recruiters</h2>
            <Link to="/admin/companies" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              All companies
            </Link>
          </header>
          <ul className="divide-y divide-line">
            {data.byCompany.slice(0, 7).map((c) => (
              <li key={c.company} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.company}</p>
                  <p className="text-xs text-ink-subtle">
                    {c.internships} posting{c.internships === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-ink-muted">{c.applications}</span>
                {c.selected > 0 && <Badge tone="good">{c.selected} placed</Badge>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
