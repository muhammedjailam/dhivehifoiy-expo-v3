export type Palette = {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  overlay: string;
  skeleton: string;
  tabBar: string;
  shadow: string;
};

export const brand = {
  purple: '#7E57C2',
  purpleLight: '#9575CD',
  purpleDeep: '#4A2574',
  lilac: '#B39DDB',
};

export const light: Palette = {
  scheme: 'light',
  bg: '#F6F4FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBF6',
  elevated: '#FFFFFF',
  text: '#17141F',
  textMuted: '#625C70',
  textFaint: '#9A94A8',
  border: '#E6E1EE',
  primary: brand.purple,
  primaryStrong: '#5E35B1',
  primarySoft: '#EDE6F8',
  onPrimary: '#FFFFFF',
  accent: '#F2A93B',
  danger: '#D93F4C',
  dangerSoft: '#FCE8EA',
  success: '#2E9E6A',
  successSoft: '#E3F5EC',
  warning: '#C98A12',
  overlay: 'rgba(16, 12, 24, 0.45)',
  skeleton: '#E9E4F1',
  tabBar: 'rgba(255,255,255,0.82)',
  shadow: '#2B1A4A',
};

export const dark: Palette = {
  scheme: 'dark',
  bg: '#0F0D14',
  surface: '#1A1722',
  surfaceAlt: '#24202E',
  elevated: '#211D2B',
  text: '#F3F0FA',
  textMuted: '#A9A2B9',
  textFaint: '#6F6880',
  border: '#2D2838',
  primary: '#A98BE0',
  primaryStrong: '#C4AEF0',
  primarySoft: '#2A2140',
  onPrimary: '#14101C',
  accent: '#F2B85B',
  danger: '#F06A75',
  dangerSoft: '#3A1D23',
  success: '#4CC38A',
  successSoft: '#16302A',
  warning: '#E8B34A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#26222F',
  tabBar: 'rgba(26,23,34,0.78)',
  shadow: '#000000',
};
