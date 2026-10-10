import { useState } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import type { AdminSummary } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { GroupedBars, SERIES, StatTile } from '../../components/Charts';
import { Button, ErrorState, Skeleton, toast } from '../../components/ui';
import { IconDownload } from '../../components/icons';

const EXPORTS = [
  { id: 'applications', title: 'All applications', body: 'Every application with student, company, status and dates.' },
  { id: 'placements', title: 'Placement records', body: 'Selected and placed students with offer details.' },
  { id: 'students', title: 'Student master list', body: 'Registered students with academic details and skills.' },
  { id: 'internships', title: 'Internship postings', body: 'All postings with criteria and application counts.' },
];

export default function Reports() {
  const [busy, setBusy] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.get<AdminSummary>('/reports/summary'), []);

  const download = async (id: string, title: string) => {
    setBusy(id);
    try {
      await api.download(`/reports/export/${id}`, `${id}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${title} downloaded.`);
    } catch {
      toast.error('Download failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHeader
        title="Reports and analytics"
        description="Department-level placement records, exportable as CSV for the annual report."
        actions={<Button variant="secondary" onClick={() => window.print()}>Print this page</Button>}
      />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Download records</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXPORTS.map((e) => (
            <div key={e.id} className="card flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink">{e.title}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">{e.body}</p>
              </div>
              <Button
                size="sm" variant="secondary" className="shrink-0 no-print"
                loading={busy === e.id}
                icon={<IconDownload className="h-4 w-4" />}
                onClick={() => download(e.id, e.title)}
              >
                CSV
              </Button>
            </div>
          ))}
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading || !data ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold">Summary</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Students placed" value={data.totals.studentsPlaced}
                        sub={`${data.totals.placementRate}% placement rate`} tone="good" />
              <StatTile label="Students applied" value={data.totals.studentsApplied}
                        sub={`${data.totals.participationRate}% participation`} />
              <StatTile label="Total applications" value={data.totals.applications} tone="navy" />
              <StatTile label="Interviews conducted" value={data.totals.interviews} tone="gold" />
            </div>
          </section>

          <section className="card mb-6 p-5">
            <h2 className="mb-1 text-sm font-semibold">Branch-wise placement</h2>
            <p className="mb-4 text-xs text-ink-muted">
              Registered, applied and placed students per branch.
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

          {/* A table view accompanies the chart, as the accessibility pass requires. */}
          <section className="card overflow-hidden">
            <header className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold">Company-wise summary</h2>
            </header>
            <div className="scroll-thin overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Postings</th>
                    <th>Applications</th>
                    <th>Selected</th>
                    <th>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCompany.map((c) => (
                    <tr key={c.company}>
                      <td className="font-medium text-ink">{c.company}</td>
                      <td className="tabular-nums text-ink-muted">{c.internships}</td>
                      <td className="tabular-nums text-ink-muted">{c.applications}</td>
                      <td className="tabular-nums text-ink-muted">{c.selected}</td>
                      <td className="tabular-nums text-ink-muted">
                        {c.applications ? `${Math.round((c.selected / c.applications) * 100)}%` : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
