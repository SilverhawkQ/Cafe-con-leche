import {
  D_REF, EY_MAX, GRIND_EXP, K, ROAST, TEMP_COEF, TIME_EXP, TIME_REF, T_REF, UNEVEN_PENALTY,
} from './constants.ts';

export type Roast = keyof typeof ROAST;
export type Input = {
  dose: number; yield: number; time: number; grind: number; temp: number; roast: Roast; prep: number;
};
export type Verdict = 'balanced' | 'sour' | 'bitter' | 'weak' | 'strong' | 'channeling';
export type Output = {
  ratio: number; flow: number; ey: number; tds: number;
  tasteX: number; tasteY: number; verdict: Verdict; particleSize: number;
};

export const DEFAULTS: Input = {
  dose: 18, yield: 36, time: 28, grind: 0.3, temp: 93, roast: 'medium', prep: 1,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function simulate(raw: Input): Output {
  const dose = clamp(raw.dose, 7, 22);
  const yld = clamp(raw.yield, 10, 80);
  const time = clamp(raw.time, 10, 60);
  const grind = clamp(raw.grind, 0, 1);
  const temp = clamp(raw.temp, 85, 98);
  const u = 1 - clamp(raw.prep, 0, 1);

  const ratio = yld / dose;
  const d = 150 + 450 * grind;
  const s = (D_REF / d) ** GRIND_EXP;
  const fT = clamp(1 + TEMP_COEF * (temp - T_REF), 0.5, 1.5);
  const contact = K * s * fT * ROAST[raw.roast] * ratio * (time / TIME_REF) ** TIME_EXP;
  const ey = EY_MAX * (1 - Math.exp(-contact)) * (1 - UNEVEN_PENALTY * u);
  const tds = (ey * dose) / yld;
  const tasteX = clamp((ey - 20) / 4, -1, 1);
  const tasteY = clamp((tds - 10) / 4, -1, 1);

  const verdict: Verdict =
    u > 0.4 ? 'channeling'
    : tasteX < -0.5 ? 'sour'
    : tasteX > 0.5 ? 'bitter'
    : tasteY < -0.5 ? 'weak'
    : tasteY > 0.5 ? 'strong'
    : 'balanced';

  return { ratio, flow: yld / time, ey, tds, tasteX, tasteY, verdict, particleSize: d };
}

export type Fix = { change: Partial<Input>; label: string; gain: number };

const STEPS: { key: 'grind' | 'dose' | 'yield' | 'temp'; delta: number; label: string }[] = [
  { key: 'grind', delta: -0.1, label: 'Grind finer' },
  { key: 'grind', delta: 0.1, label: 'Grind coarser' },
  { key: 'dose', delta: 1, label: 'Raise dose 1 g' },
  { key: 'dose', delta: -1, label: 'Lower dose 1 g' },
  { key: 'yield', delta: 4, label: 'Raise yield 4 g' },
  { key: 'yield', delta: -4, label: 'Lower yield 4 g' },
  { key: 'temp', delta: 1, label: 'Raise temp 1 C' },
  { key: 'temp', delta: -1, label: 'Lower temp 1 C' },
];

// Distance from the balanced zone center; the y term is weighted lower so an
// off-axis fix does not outrank an on-axis one by accident.
const miss = (o: Output) => Math.hypot(o.tasteX, o.tasteY);

// ponytail: fixed single-step candidates, ranked by miss reduction. Search multi-step if needed.
export function suggestFixes(input: Input): Fix[] {
  const base = simulate(input);
  const baseMiss = miss(base);
  return STEPS
    .map(({ key, delta, label }) => {
      const change = { [key]: input[key] + delta };
      const after = simulate({ ...input, ...change });
      // A step that pushes the other axis out of range is not a fix.
      const worse = Math.abs(after.tasteY) > 0.5 && Math.abs(after.tasteY) > Math.abs(base.tasteY);
      return { change, label, gain: worse ? 0 : baseMiss - miss(after) };
    })
    .filter((f) => f.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
}
