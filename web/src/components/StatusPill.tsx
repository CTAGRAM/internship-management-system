import { Badge } from './ui';
import { STATUS_LABEL, STATUS_STEP } from '../lib/format';
import type { ApplicationStatus } from '../lib/types';

/**
 * Status is reserved colour: it always ships with its label and a dot, never
 * colour alone, so it stays readable for colour-blind users and in print.
 */
const TONE: Record<ApplicationStatus, 'info' | 'navy' | 'warn' | 'good' | 'bad' | 'neutral'> = {
  applied: 'info',
  shortlisted: 'navy',
  interview_scheduled: 'warn',
  selected: 'good',
  offer_accepted: 'good',
  completed: 'good',
  rejected: 'bad',
  offer_declined: 'neutral',
};

const DOT: Record<ApplicationStatus, string> = {
  applied: 'bg-sky-500',
  shortlisted: 'bg-navy-500',
  interview_scheduled: 'bg-amber-500',
  selected: 'bg-emerald-500',
  offer_accepted: 'bg-emerald-600',
  completed: 'bg-emerald-700',
  rejected: 'bg-rose-500',
  offer_declined: 'bg-slate-400',
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <Badge tone={TONE[status]} icon={<span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * The four-stage pipeline as a stepper: Applied -> Shortlisted -> Interview ->
 * Selected. A rejected application shows the stage it stopped at.
 */
export function StatusSteps({ status }: { status: ApplicationStatus }) {
  const step = STATUS_STEP[status];
  const stopped = status === 'rejected' || status === 'offer_declined';
  const labels = ['Applied', 'Shortlisted', 'Interview', 'Selected'];

  return (
    <div>
      <div className="flex items-center gap-1" aria-hidden>
        {labels.map((_, i) => (
          <div
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              stopped && i === 0 ? 'bg-rose-400'
                : i < step ? 'bg-navy-700 dark:bg-navy-400'
                : 'bg-surface-sunken',
            ].join(' ')}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-subtle">
        {labels.map((l, i) => (
          <span key={l} className={i < step ? 'font-medium text-ink-muted' : ''}>{l}</span>
        ))}
      </div>
      <span className="sr-only">
        {stopped ? `Application ${STATUS_LABEL[status]}` : `Stage ${step} of 4: ${STATUS_LABEL[status]}`}
      </span>
    </div>
  );
}
