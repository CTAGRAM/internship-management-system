import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { avatarTone, initials } from '../lib/format';

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

/* --------------------------------------------------------------- Button */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest
}: ButtonProps) {
  const variants = {
    primary: 'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-sm dark:bg-navy-600 dark:hover:bg-navy-500',
    secondary: 'border border-line bg-surface-raised text-ink hover:bg-surface-sunken active:bg-line/50',
    ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
    gold: 'bg-gold-400 text-navy-950 hover:bg-gold-300 active:bg-gold-500 shadow-sm font-semibold',
  };
  const sizes = {
    sm: 'h-8 px-3 text-[13px] gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-lg font-medium transition',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className,
      )}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ----------------------------------------------------------- Form fields */
export function Field({
  label, hint, error, required, children,
}: { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
             : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className={cx('input', p.className)} />;

export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...p} className={cx('input resize-y', p.className)} />;

export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className={cx('input cursor-pointer pr-8', p.className)} />;

/** Comma/Enter driven tag editor used for skills. */
export function TagInput({
  value, onChange, placeholder = 'Type a skill and press Enter', suggestions = [],
}: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [draft, setDraft] = useState('');
  const lower = value.map((v) => v.toLowerCase());

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '');
    if (tag && !lower.includes(tag.toLowerCase())) onChange([...value, tag]);
    setDraft('');
  };

  const open = draft.trim().length > 0;
  const matches = suggestions
    .filter((s) => s.toLowerCase().includes(draft.trim().toLowerCase()) && !lower.includes(s.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="relative">
      <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-raised p-2 focus-within:border-navy-500 focus-within:ring-2 focus-within:ring-navy-500/20">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-navy-50 px-2 py-1 text-xs font-medium text-navy-800 dark:bg-navy-900 dark:text-navy-100">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="text-navy-400 transition hover:text-rose-500"
              aria-label={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-subtle"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-raised shadow-pop">
          {matches.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="w-full px-3 py-2 text-left text-sm transition hover:bg-surface-sunken"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */
export function Badge({
  children, tone = 'neutral', icon, className,
}: { children: ReactNode; tone?: 'neutral' | 'navy' | 'gold' | 'good' | 'warn' | 'bad' | 'info'; icon?: ReactNode; className?: string }) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-muted border-line',
    navy: 'bg-navy-50 text-navy-800 border-navy-100 dark:bg-navy-900/60 dark:text-navy-100 dark:border-navy-800',
    gold: 'bg-gold-50 text-gold-800 border-gold-200 dark:bg-gold-900/40 dark:text-gold-100 dark:border-gold-800',
    good: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900',
    warn: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900',
    bad: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900',
    info: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900',
  };
  return (
    <span className={cx(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
      tones[tone], className,
    )}>
      {icon}{children}
    </span>
  );
}

/* ---------------------------------------------------------------- Avatar */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg' };
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size], avatarTone(name))}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ----------------------------------------------------------------- Modal */
export function Modal({
  open, onClose, title, description, children, footer, width = 'md',
}: {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: ReactNode; footer?: ReactNode; width?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy-950/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close dialog" tabIndex={-1} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative z-10 w-full animate-fade-up rounded-t-2xl bg-surface-raised shadow-pop outline-none sm:rounded-2xl',
          widths[width],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-m-1 rounded-lg p-1 text-ink-subtle transition hover:bg-surface-sunken hover:text-ink"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Toast */
type Toast = { id: number; message: string; tone: 'good' | 'bad' | 'info' };
let pushToast: ((t: Omit<Toast, 'id'>) => void) | null = null;

export const toast = {
  success: (message: string) => pushToast?.({ message, tone: 'good' }),
  error: (message: string) => pushToast?.({ message, tone: 'bad' }),
  info: (message: string) => pushToast?.({ message, tone: 'info' }),
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000);
    };
    return () => { pushToast = null; };
  }, []);

  const tones = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
    bad: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100',
    info: 'border-navy-200 bg-navy-50 text-navy-900 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-50',
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            'pointer-events-auto w-full max-w-sm animate-fade-up rounded-xl border px-4 py-3 text-sm font-medium shadow-lift',
            tones[t.tone],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- State placeholders */
export function EmptyState({
  title, description, action, icon,
}: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-subtle">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) =>
  <div className={cx('skeleton', className)} />;

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */
export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="scroll-thin -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cx(
              'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition',
              active ? 'text-navy-800 dark:text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cx(
                'ml-1.5 rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                active ? 'bg-navy-100 text-navy-800 dark:bg-navy-800 dark:text-white' : 'bg-surface-sunken text-ink-subtle',
              )}>
                {t.count}
              </span>
            )}
            {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-navy-700 dark:bg-white" />}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Progress */
export function Progress({ value, tone = 'navy' }: { value: number; tone?: 'navy' | 'gold' | 'good' }) {
  const tones = { navy: 'bg-navy-700 dark:bg-navy-400', gold: 'bg-gold-400', good: 'bg-emerald-600' };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={value}>
      <div className={cx('h-full rounded-full transition-all duration-500', tones[tone])}
           style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
