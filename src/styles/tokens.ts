// Single source of truth for colors. Scene reads hex directly; CSS reads --name vars.
export const tokens = {
  water: '#4FC3F7',
  grounds: '#6D4C41',
  espresso: '#8D4B1F',
  crema: '#F3D9A4',
  sour: '#C6E03A',
  bitter: '#6A2C70',
  good: '#43A047',
  metal: '#CFD8DC',
  slab: '#D7B98E',
  handle: '#3E2723',
  bg: '#FFF8EE',
  outline: '#2B1B14',
} as const;

export const cssVars = Object.fromEntries(
  Object.entries(tokens).map(([k, v]) => [`--${k}`, v]),
) as Record<string, string>;
