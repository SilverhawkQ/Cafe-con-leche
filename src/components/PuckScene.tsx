import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { DEFAULTS, simulate, type Input } from '../model/simulate.ts';
import { cssVars } from '../styles/tokens.ts';
import Feedback from './Feedback.tsx';
import PortafilterScene, { CAMERA } from './PortafilterScene.tsx';
import '../styles/scene.css';

const SLIDERS: { key: keyof Input; label: string; min: number; max: number; step: number; ends?: [string, string] }[] = [
  { key: 'dose', label: 'Dose (g)', min: 7, max: 22, step: 0.5 },
  { key: 'yield', label: 'Yield (g)', min: 10, max: 80, step: 1 },
  { key: 'time', label: 'Time (s)', min: 10, max: 60, step: 1 },
  { key: 'temp', label: 'Temp', min: 85, max: 98, step: 0.5 },
  { key: 'grind', label: 'Grind', min: 0, max: 1, step: 0.01, ends: ['Fine', 'Coarse'] },
];

const toF = (c: number) => (c * 9) / 5 + 32;
const toC = (f: number) => ((f - 32) * 5) / 9;
const decimals = (step: number) => (step < 0.1 ? 2 : step < 1 ? 1 : 0);

const hasWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

export default function PuckScene() {
  const [input, setInput] = useState<Input>(DEFAULTS);
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [reduced, setReduced] = useState(false);
  const [gl, setGl] = useState(true);
  useEffect(() => {
    setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches);
    setGl(hasWebGL());
  }, []);
  const out = simulate(input);

  return (
    <div className="app" style={cssVars}>
      <header className="title">
        <h1>Espresso Dialer</h1>
        <Feedback />
      </header>
      <div className="stage">
        {gl ? (
          <Canvas dpr={[1, 1.5]} frameloop={reduced ? 'demand' : 'always'} camera={{ position: CAMERA, fov: 45 }}>
            <PortafilterScene out={out} input={input} reduced={reduced} />
          </Canvas>
        ) : (
          <p className="fallback">3D is not available on this device. The numbers below still update.</p>
        )}
      </div>
      <div className="readout">
        <div className="verdict" data-v={out.verdict}>{out.verdict}</div>
        <div><b>1:{out.ratio.toFixed(1)}</b><span>ratio</span></div>
        <div><b>{out.ey.toFixed(1)}%</b><span>extraction</span></div>
        <div><b>{out.tds.toFixed(1)}%</b><span>TDS</span></div>
        <div><b>{out.flow.toFixed(1)}</b><span>g/s</span></div>
      </div>
      {SLIDERS.map((s) => {
        const f = s.key === 'temp' && unit === 'F';
        const raw = input[s.key] as number;
        const shown = f ? Math.round(toF(raw)) : raw;
        return (
          <div className="control" key={s.key}>
            <div className="control-head">
              <label htmlFor={s.key}>{s.label}</label>
              {!s.ends && (
                <span className="value">
                  {shown.toFixed(f ? 0 : decimals(s.step))}
                  {s.key === 'temp' && `°${unit}`}
                </span>
              )}
              {s.key === 'temp' && (
                <div className="unit-toggle" role="group" aria-label="Temperature unit">
                  {(['C', 'F'] as const).map((u) => (
                    <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>°{u}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="slider-row">
              {s.ends && <span aria-hidden="true">{s.ends[0]}</span>}
              <input
                id={s.key}
                type="range"
                min={f ? Math.round(toF(s.min)) : s.min}
                max={f ? Math.round(toF(s.max)) : s.max}
                step={f ? 1 : s.step}
                value={shown}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInput({ ...input, [s.key]: f ? toC(v) : v });
                }}
              />
              {s.ends && <span aria-hidden="true">{s.ends[1]}</span>}
            </div>
          </div>
        );
      })}
      <div className="control">
        <div className="control-head"><label htmlFor="roast">Roast</label></div>
        <select id="roast" value={input.roast} onChange={(e) => setInput({ ...input, roast: e.target.value as Input['roast'] })}>
          <option value="light">Light</option>
          <option value="medium">Medium</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <p className="note">An approximate model for learning, not a lab measurement.</p>
    </div>
  );
}
