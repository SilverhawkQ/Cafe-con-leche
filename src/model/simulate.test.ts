import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULTS, simulate, suggestFixes } from './simulate.ts';

const near = (a: number, b: number, tol = 0.1) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('spec test vectors', () => {
  const cases = [
    [{}, 20.0, 10.0, 0.0, 0.0, 'balanced'],
    [{ grind: 0.1 }, 22.1, 11.0, 0.51, 0.26, 'bitter'],
    [{ grind: 0.6 }, 17.9, 8.9, -0.53, -0.27, 'sour'],
    [{ yield: 45 }, 22.4, 9.0, 0.6, -0.26, 'bitter'],
  ] as const;
  for (const [patch, ey, tds, x, y, verdict] of cases) {
    const o = simulate({ ...DEFAULTS, ...patch });
    near(o.ey, ey);
    near(o.tds, tds);
    near(o.tasteX, x, 0.1);
    near(o.tasteY, y, 0.1);
    assert.equal(o.verdict, verdict);
  }
});

test('monotonic in time, yield, temp, grind', () => {
  const ey = (p: object) => simulate({ ...DEFAULTS, ...p }).ey;
  assert.ok(ey({ time: 35 }) > ey({ time: 25 }));
  assert.ok(ey({ yield: 40 }) > ey({ yield: 36 }));
  assert.ok(ey({ temp: 95 }) > ey({ temp: 91 }));
  assert.ok(ey({ grind: 0.2 }) > ey({ grind: 0.4 }));
});

test('bounds and consistency over a grid', () => {
  for (const grind of [0, 0.5, 1])
    for (const yld of [10, 36, 80])
      for (const time of [10, 30, 60]) {
        const inp = { ...DEFAULTS, grind, yield: yld, time };
        const o = simulate(inp);
        assert.ok(o.ey >= 0 && o.ey <= 30);
        assert.ok(Math.abs(o.tasteX) <= 1 && Math.abs(o.tasteY) <= 1);
        near(o.tds * yld / inp.dose, o.ey, 1e-9);
      }
});

test('channeling lowers EY and sets verdict', () => {
  const o = simulate({ ...DEFAULTS, prep: 0 });
  assert.ok(o.ey < simulate(DEFAULTS).ey);
  assert.equal(o.verdict, 'channeling');
});

test('out-of-range input is clamped', () => {
  assert.doesNotThrow(() => simulate({ ...DEFAULTS, dose: 0, yield: 999, grind: 5 }));
});

test('fixes for a sour shot raise extraction; balanced shot has none', () => {
  const sour = { ...DEFAULTS, grind: 0.6 };
  const fixes = suggestFixes(sour);
  assert.ok(fixes.length > 0 && fixes.length <= 3);
  for (const f of fixes)
    assert.ok(simulate({ ...sour, ...f.change }).ey > simulate(sour).ey);
  assert.equal(suggestFixes(DEFAULTS).length, 0);
});
