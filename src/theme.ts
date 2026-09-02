// Design tokens ported from the Ancillary Reconciliation design handoff.
// Source tokens were specified in oklch(); React Native has no oklch support,
// so each is converted to its closest sRGB hex equivalent.
export const colors = {
  background: '#F2F3F5',
  card: '#FFFFFF',
  ink: '#1C1E22',
  sub: '#797C82',
  border: '#E3E5E9',
  accent: '#2A56C6',

  good: '#1E8E5A',
  goodBg: '#E3F6EA',
  bad: '#C1341A',
  badBg: '#FBE7E1',
  warn: '#8A6A1E',
  warnBg: '#FAF0D6',

  white: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.4)',
} as const;

export const accentPalette = {
  blue: '#2A56C6',
  green: '#2E8B4E',
  red: '#B23A1E',
  purple: '#5B3FA0',
} as const;

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  sheet: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const type = {
  header: { fontSize: 28, fontWeight: '700' as const },
  sectionLabel: { fontSize: 13, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  eyebrow: { fontSize: 13, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
  statValue: { fontSize: 26, fontWeight: '700' as const },
  statLabel: { fontSize: 12, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '600' as const },
  meta: { fontSize: 13, fontWeight: '400' as const },
  metaSmall: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 15, fontWeight: '600' as const },
  sheetTitle: { fontSize: 18, fontWeight: '700' as const },
  pill: { fontSize: 12, fontWeight: '700' as const },
};
