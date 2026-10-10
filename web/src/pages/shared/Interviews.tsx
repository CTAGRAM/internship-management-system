import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { dateTime, relative } from '../../lib/format';
import type { Interview } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { Avatar, Badge, Button, EmptyState, ErrorState, Skeleton, cx } from '../../components/ui';
import { IconCalendar, IconLocation, IconVideo } from '../../components/icons';

/** Interview schedule, scoped by role on the server. */
export default function Interviews() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get<Interview[]>('/interviews'), []);

  const all = data ?? [];
  const now = Date.now();
  const upcoming = all.filter((i) => new Date(i.scheduled_at).getTime() >= now);
  const past = all.filter((i) => new Date(i.scheduled_at).getTime() < now).reverse();
  const isStudent = user?.role === 'student';

  return (
    <>
      <PageHeader
        title="Interviews"
        description={isStudent
          ? 'Your scheduled interview rounds, with joining details.'
          : 'Every interview round scheduled through the portal.'}
      />

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<IconCalendar className="h-8 w-8" />}
          title="No interviews scheduled"
          description={isStudent
            ? 'Once a recruiter shortlists you and schedules a round, it will appear here.'
            : 'Schedule interviews from a posting pipeline.'}
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title="Upcoming" items={upcoming} isStudent={isStudent} highlight />
          )}
          {past.length > 0 && <Section title="Past" items={past} isStudent={isStudent} />}
        </div>
      )}
    </>
  );
}

function Section({
  title, items, isStudent, highlight,
}: { title: string; items: Interview[]; isStudent: boolean; highlight?: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink">{title} <span className="text-ink-subtle">({items.length})</span></h2>
      <ul className="space-y-3">
        {items.map((iv) => (
          <li key={iv.id} className={cx('card p-4', highlight && 'border-l-[3px] border-l-gold-400')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {!isStudent && <Avatar name={iv.student_name ?? '?'} size="md" />}
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {isStudent ? iv.title : iv.student_name}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {isStudent
                      ? `${iv.company_name} · ${iv.round} round`
                      : `${iv.title} · ${iv.round} round`}
                  </p>
                  {!isStudent && (
                    <p className="text-xs text-ink-subtle">{iv.enrollment_no} &middot; {iv.branch}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={iv.outcome === 'passed' ? 'good' : iv.outcome === 'failed' ? 'bad' : 'warn'}>
                  {iv.outcome === 'pending' ? relative(iv.scheduled_at) : iv.outcome}
                </Badge>
                <span className="text-xs text-ink-subtle">{dateTime(iv.scheduled_at)}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                {iv.mode === 'online'
                  ? <><IconVideo className="h-4 w-4" /> Online</>
                  : <><IconLocation className="h-4 w-4" /> {iv.venue}</>}
              </span>
              {iv.mode === 'online' && iv.meeting_link && iv.outcome === 'pending' && (
                <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener" className="ml-auto">
                  <Button size="sm" variant="secondary">Join meeting</Button>
                </a>
              )}
            </div>

            {iv.notes && <p className="mt-2.5 text-sm text-ink-muted">{iv.notes}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
