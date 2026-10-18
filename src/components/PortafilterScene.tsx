import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Input, Output } from '../model/simulate.ts';
import { tokens } from '../styles/tokens.ts';
import { Crack, Cup, Droplets, Hull, Lights, Pebbles, Stream, Toon, cupTop, fillOf } from './parts.tsx';

export type SceneProps = { out: Output; input: Input; reduced: boolean };

export const CAMERA: [number, number, number] = [0, 4, 10];
const CRACK_X = 0.5;
const BED_R = 1.28; // coffee bed fills the basket to the rim
const CUP_Y = -3.2;
const BED_Y = -0.025; // bed center; spans -0.5 .. 0.45

// Portafilter with the front half of the basket cut away: the coffee bed shows as a
// cross-section of pebbles on the cut face and as a half-disc surface on top.
export default function PortafilterScene({ out, input, reduced }: SceneProps) {
  const r = out.particleSize / 3000;
  const top = { w: BED_R * 2, h: BED_R * 2, d: 0.4, round: true, half: true };
  const cut = { w: BED_R * 2 - 0.1, h: 0.9, d: 0.5 };
  const crackW = (1 - input.prep) * 0.3;
  const chord = 2 * Math.sqrt(Math.max(0, BED_R ** 2 - CRACK_X ** 2));
  const fill = fillOf(input.yield);
  const cupSurface = cupTop(CUP_Y, fill);
  const sr = (0.02 + out.flow * 0.04) * 0.6;
  const backHalf = [Math.PI / 2, Math.PI] as const; // thetaStart, thetaLength: wall behind the cut
  const basket = [1.4, 1.3, 1.1, 32, 1, true, ...backHalf] as const;
  const bed = [BED_R, BED_R, 0.95, 40, 1, false, ...backHalf] as const;
  const handle = [0.2, 0.17, 1.8, 16] as const;
  return (
    <>
      <Lights />
      <mesh>
        <cylinderGeometry args={basket} />
        <meshToonMaterial color={tokens.metal} side={THREE.DoubleSide} />
      </mesh>
      <Hull scale={1.04}>
        <cylinderGeometry args={basket} />
      </Hull>
      <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.08, 8, 32, Math.PI]} />
        <Toon color={tokens.metal} />
      </mesh>
      <mesh position={[0, BED_Y, 0]}>
        <cylinderGeometry args={bed} />
        <Toon color={tokens.slab} opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Pebbles r={r} area={top} tasteX={out.tasteX} reduced={reduced} rise="z" />
        <Crack x={CRACK_X} w={crackW} len={chord / 2} y={chord / 4} z={0.05} thick={0.45} />
      </group>
      <group position={[0, BED_Y, 0]}>
        <mesh>
          <boxGeometry args={[cut.w, cut.h, cut.d]} />
          <Toon color={tokens.slab} opacity={0.45} />
        </mesh>
        <Hull scale={1.03}>
          <boxGeometry args={[cut.w, cut.h, cut.d]} />
        </Hull>
        <Pebbles r={r} area={cut} tasteX={out.tasteX} reduced={reduced} />
        <Crack x={CRACK_X} w={crackW} len={cut.h - 0.1} thick={0.4} />
      </group>
      <Droplets
        flow={out.flow} crackW={crackW} crackX={CRACK_X} width={BED_R * 2} depth={chord}
        yTop={2.0} yBottom={0.5} round half reduced={reduced}
      />
      <Droplets
        flow={out.flow} crackW={crackW} crackX={CRACK_X} width={cut.w} zCenter={0.3}
        yTop={0.45} yBottom={-0.5} reduced={reduced}
      />
      <group position={[2.2, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={handle} />
          <Toon color={tokens.handle} />
        </mesh>
        <Hull scale={1.08}>
          <cylinderGeometry args={handle} />
        </Hull>
      </group>
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[1.3, 0.25, 0.5, 24]} />
        <Toon color={tokens.metal} />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <group key={x}>
          <mesh position={[x, -1.2, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
            <Toon color={tokens.metal} />
          </mesh>
          <Stream x={x} yTop={-1.3} yBottom={cupSurface} r={sr} />
        </group>
      ))}
      <Cup y={CUP_Y} fill={fill} verdict={out.verdict} />
      <OrbitControls enablePan={false} enableDamping minDistance={3.5} maxDistance={14} target={[0.4, -1.4, 0]} />
    </>
  );
}
