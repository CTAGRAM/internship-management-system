import type { ApplicationStatus } from './types';

/** Indian-format currency, e.g. 25000 -> "Rs 25,000". */
export const money = (n: number | null | undefined) =>
  n == null || n <= 0 ? 'Unpaid' : `₹${Number(n).toLocaleString('en-IN')}`;

export const shortMoney = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${n}`;

export const date = (iso: string | null | undefined) =>
  !iso ? '--' : new Date(iso.includes('T') || iso.includes(' ') ? iso : `${iso}T00:00:00`)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const dateTime = (iso: string | null | undefined) =>
  !iso ? '--' : new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  });

/** "3 days ago", "in 5 days", "today". */
export function relative(iso: string | null | undefined) {
  if (!iso) return '--';
  const then = new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') : `${iso}T00:00:00`);
  const days = Math.round((then.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

export const deadlineTone = (deadline: string) => {
  const days = Math.round(
    (new Date(`${deadline}T00:00:00`).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) return 'past' as const;
  if (days <= 3) return 'urgent' as const;
  if (days <= 7) return 'soon' as const;
  return 'normal' as const;
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/**
 * A stable colour per name for avatars. Deterministic so the same person keeps
 * the same colour across every screen.
 */
export function avatarTone(name: string) {
  const tones = [
    'bg-navy-100 text-navy-800 dark:bg-navy-900 dark:text-navy-100',
    'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-100',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
    'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

export const STATUS_ORDER: ApplicationStatus[] = [
  'applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected',
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview',
  selected: 'Selected',
  rejected: 'Not selected',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  completed: 'Completed',
};

/** How far along the 4-step pipeline a status sits, for progress bars. */
export const STATUS_STEP: Record<ApplicationStatus, number> = {
  applied: 1, shortlisted: 2, interview_scheduled: 3, selected: 4,
  offer_accepted: 4, completed: 4, rejected: 0, offer_declined: 0,
};

export const WORK_MODE_LABEL = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' } as const;

export const BRANCHES = ['CSE', 'AI & DS', 'IT', 'ENTC', 'Mechanical', 'Civil'];
