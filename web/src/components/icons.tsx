/** Thin line icons, 20x20 grid, inherit currentColor. */
const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
type P = { className?: string };

export const IconHome = (p: P) => (
  <svg {...base} {...p}><path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconSearch = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" /></svg>
);
export const IconBriefcase = (p: P) => (
  <svg {...base} {...p}><rect x="2.5" y="6" width="15" height="10.5" rx="1.5" /><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M2.5 10h15" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base} {...p}><circle cx="10" cy="7" r="3.2" /><path d="M4 16.5c.8-2.8 3.1-4.3 6-4.3s5.2 1.5 6 4.3" /></svg>
);
export const IconUsers = (p: P) => (
  <svg {...base} {...p}><circle cx="7.5" cy="7" r="2.8" /><path d="M2.5 16c.6-2.4 2.5-3.7 5-3.7s4.4 1.3 5 3.7M13.5 5.2a2.8 2.8 0 0 1 0 5.4M14.5 12.6c1.8.4 2.8 1.6 3.2 3.4" /></svg>
);
export const IconBuilding = (p: P) => (
  <svg {...base} {...p}><path d="M3.5 17V4.5A1.5 1.5 0 0 1 5 3h6a1.5 1.5 0 0 1 1.5 1.5V17M12.5 8H15a1.5 1.5 0 0 1 1.5 1.5V17M2 17h16M6 6.5h3M6 9.5h3M6 12.5h3" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="14" height="12.5" rx="1.5" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base} {...p}><path d="M3 17h14M6 14V9M10 14V5M14 14v-3" /></svg>
);
export const IconBell = (p: P) => (
  <svg {...base} {...p}><path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0 0 10 3ZM8.5 15a1.6 1.6 0 0 0 3 0" /></svg>
);
export const IconFile = (p: P) => (
  <svg {...base} {...p}><path d="M11.5 2.5H6A1.5 1.5 0 0 0 4.5 4v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5zM11.5 2.5v4h4" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}><path d="M10 4.5v11M4.5 10h11" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
);
export const IconX = (p: P) => (
  <svg {...base} {...p}><path d="M5 5l10 10M15 5 5 15" /></svg>
);
export const IconLogout = (p: P) => (
  <svg {...base} {...p}><path d="M12.5 14v2a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V4A1.5 1.5 0 0 1 5 2.5h6A1.5 1.5 0 0 1 12.5 4v2M8 10h9m0 0-2.5-2.5M17 10l-2.5 2.5" /></svg>
);
export const IconMenu = (p: P) => (
  <svg {...base} {...p}><path d="M3 6h14M3 10h14M3 14h14" /></svg>
);
export const IconSun = (p: P) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="3.5" /><path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.7 4.3l-1 1M5.3 14.7l-1 1M15.7 15.7l-1-1M5.3 5.3l-1-1" /></svg>
);
export const IconMoon = (p: P) => (
  <svg {...base} {...p}><path d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z" /></svg>
);
export const IconMegaphone = (p: P) => (
  <svg {...base} {...p}><path d="M4 8v4a1.5 1.5 0 0 0 1.5 1.5H7l6 3.5V4.5L7 8zM13 8.2a2.5 2.5 0 0 1 0 3.6M6.5 13.5V17" /></svg>
);
export const IconDownload = (p: P) => (
  <svg {...base} {...p}><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M3.5 14v2A1.5 1.5 0 0 0 5 17.5h10a1.5 1.5 0 0 0 1.5-1.5v-2" /></svg>
);
export const IconLocation = (p: P) => (
  <svg {...base} {...p}><path d="M10 17s5.5-4.6 5.5-9A5.5 5.5 0 0 0 4.5 8c0 4.4 5.5 9 5.5 9Z" /><circle cx="10" cy="8" r="2" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base} {...p}><circle cx="10" cy="10" r="7" /><path d="M10 6v4.2l2.8 1.8" /></svg>
);
export const IconVideo = (p: P) => (
  <svg {...base} {...p}><rect x="2.5" y="5.5" width="10" height="9" rx="1.5" /><path d="m12.5 10 5-2.5v5z" /></svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base} {...p}><path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM15.5 13.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" /></svg>
);
