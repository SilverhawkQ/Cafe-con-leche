// Tuning knobs for the extraction model. See specs/01-domain-model.md.
export const EY_MAX = 30;
export const K = 0.519; // calibrated so the default recipe gives EY = 20.0%
export const D_REF = 285; // um, particle size at grind 0.3
export const GRIND_EXP = 0.5;
export const T_REF = 93;
export const TEMP_COEF = 0.02;
export const TIME_REF = 25;
export const TIME_EXP = 0.5;
export const UNEVEN_PENALTY = 0.25;
export const ROAST = { light: 0.9, medium: 1.0, dark: 1.1 } as const;
