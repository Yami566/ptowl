export const COLORS = {
  // Green (safe/OK state)
  greenLight: '#AADFAA',
  greenLightAlt: '#B4E9A9',
  greenMid: '#4CAF50',
  greenDark: '#1B5E20',

  // Orange (attention/action needed)
  orangeLight: '#FFDBBB',
  orangeLightAlt: '#FFB84F',
  orangeMid: '#FF7043',
  orangeDark: '#FF6F20',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#FAFCFA',
  grayLight: '#F0F4F0',
  grayMid: '#D0D8D0',
  grayText: '#6B7F73',
  dark: '#1A2E23',
  darkAlt: '#2D4A37',

  // Print-specific
  printRowAlt: '#F5FAF5',
  printHeaderBg: '#B4E9A9',
  printHeaderText: '#1B5E20',
  printSent: '#1B5E20',
  printNotSent: '#FF7043',
} as const;

export type ColorToken = keyof typeof COLORS;
