import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Output } from '../model/simulate.ts';
import { tokens } from '../styles/tokens.ts';

export const rand = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function useToonGradient() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
}

export const Toon = ({ color, opacity, side }: { color: string; opacity?: number; side?: THREE.Side }) => {
  const gradientMap = useToonGradient();
  return (
    <meshToonMaterial color={color} gradientMap={gradientMap} transparent={opacity !== undefined} opacity={opacity} side={side} />
  );
};

// Inverted-hull outline: a slightly larger back-face copy of the geometry.
export const Hull = ({ children, scale = 1.06 }: { children: ReactNode; scale?: number }) => (
  <mesh scale={scale}>
    {children}
    <meshBasicMaterial color={tokens.outline} side={THREE.BackSide} />
  </mesh>
);

export const Lights = () => (
  <>
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 5, 4]} intensity={1.6} />
  </>
);

export type Area = { w: number; h: number; d: number; round?: boolean; half?: boolean };

// Pebbles on a jittered grid in the local XY plane, with taste-colored wisps rising off them.
// rise 'z' lets a rotated group (top view) send wisps toward the camera.
export function Pebbles({ r, area, tasteX, reduced, rise = 'y' }: {
  r: number; area: Area; tasteX: number; reduced: boolean; rise?: 'y' | 'z';
}) {
  const { w, h, d, round, half } = area;
  const pos = useMemo(() => {
    const cols = Math.max(2, Math.floor((w - 0.2) / (2.2 * r)));
    const rows = Math.max(2, Math.floor((h - 0.2) / (2.2 * r)));
    const list: THREE.Vector3[] = [];
    for (let i = 0; i < cols * rows && list.length < 700; i++) {
      const x = -w / 2 + 0.1 + ((i % cols) + 0.5) * ((w - 0.2) / cols) + (rand(i) - 0.5) * r * 0.6;
      const y = -h / 2 + 0.1 + (Math.floor(i / cols) + 0.5) * ((h - 0.2) / rows) + (rand(i, 1) - 0.5) * r * 0.6;
      if (round && Math.hypot(x, y) > Math.min(w, h) / 2 - r) continue;
      if (half && y < 0) continue; // keep the local +y half (world back half when rotated -90deg about X)
      list.push(new THREE.Vector3(x, y, (rand(i, 2) - 0.5) * d * 0.5));
    }
    return list;
  }, [r, w, h, d, round, half]);
  const count = pos.length;
  const pebbles = useRef<THREE.InstancedMesh>(null!);
  const hulls = useRef<THREE.InstancedMesh>(null!);
  const wisps = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const wispColor = useMemo(
    () => new THREE.Color(tokens.sour).lerp(new THREE.Color(tokens.bitter), (tasteX + 1) / 2),
    [tasteX],
  );

  useLayoutEffect(() => {
    pos.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.scale.setScalar(r * (0.85 + rand(i, 3) * 0.3));
      dummy.updateMatrix();
      pebbles.current.setMatrixAt(i, dummy.matrix);
      dummy.scale.multiplyScalar(1.15);
      dummy.updateMatrix();
      hulls.current.setMatrixAt(i, dummy.matrix);
    });
    pebbles.current.instanceMatrix.needsUpdate = hulls.current.instanceMatrix.needsUpdate = true;
  }, [pos, r, dummy]);

  const W = 24;
  useFrame(({ clock }) => {
    if (!count) return;
    const t = reduced ? 0.3 : clock.elapsedTime;
    for (let i = 0; i < W; i++) {
      const p = pos[(i * 7) % count];
      const k = (t * 0.35 + rand(i, 4)) % 1;
      if (rise === 'y') dummy.position.set(p.x, p.y + k * 0.7, p.z + r);
      else dummy.position.set(p.x, p.y, p.z + r + k * 0.7);
      dummy.scale.setScalar(0.07 * Math.sin(Math.PI * k) + 0.001);
      dummy.updateMatrix();
      wisps.current.setMatrixAt(i, dummy.matrix);
    }
    wisps.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh key={`p${count}`} ref={pebbles} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <Toon color={tokens.grounds} />
      </instancedMesh>
      <instancedMesh key={`h${count}`} ref={hulls} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={tokens.outline} side={THREE.BackSide} />
      </instancedMesh>
      <instancedMesh ref={wisps} args={[undefined, undefined, W]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={wispColor} />
      </instancedMesh>
    </>
  );
}

// Water falling through a rectangular (width x depth) or round (diameter = width) area.
export function Droplets({ flow, crackW, crackX, width, depth = 0, zCenter = 0, yTop, yBottom, round, half, reduced }: {
  flow: number; crackW: number; crackX: number; width: number; depth?: number; zCenter?: number;
  yTop: number; yBottom: number; round?: boolean; half?: boolean; reduced: boolean;
}) {
  const D = 40;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = reduced ? 0.5 : clock.elapsedTime;
    const speed = 0.25 + flow * 0.25;
    for (let i = 0; i < D; i++) {
      const inCrack = i % 4 === 0 && crackW > 0.03;
      const k = (t * speed * (inCrack ? 2 : 1) + rand(i, 5)) % 1;
      let x: number;
      let z: number;
      if (inCrack) {
        x = crackX + (rand(i, 6) - 0.5) * crackW;
        z = zCenter + (rand(i, 11) - 0.5) * depth * 0.9;
      } else if (round) {
        const a = rand(i, 6) * Math.PI * 2;
        const rad = Math.sqrt(rand(i, 7)) * (width / 2 - 0.1);
        x = rad * Math.cos(a);
        z = zCenter + rad * Math.sin(a);
      } else {
        x = (rand(i, 7) - 0.5) * (width - 0.3);
        z = zCenter + (rand(i, 11) - 0.5) * depth;
      }
      if (half) z = zCenter - Math.abs(z - zCenter);
      dummy.position.set(x, yTop - k * (yTop - yBottom), z);
      dummy.scale.set(0.05, 0.05 * (inCrack ? 1.8 : 1.3), 0.05);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, D]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={tokens.water} />
    </instancedMesh>
  );
}

export function Face({ verdict, position }: { verdict: Output['verdict']; position: [number, number, number] }) {
  const happy = verdict === 'balanced' || verdict === 'strong';
  const sad = verdict === 'bitter' || verdict === 'channeling';
  return (
    <group position={position}>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={tokens.outline} />
        </mesh>
      ))}
      <mesh position={[0, sad ? -0.15 : -0.05, 0]} rotation={[0, 0, happy ? Math.PI : 0]} scale={sad || happy ? 1 : [1, 0.01, 1]}>
        <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI]} />
        <meshBasicMaterial color={tokens.outline} />
      </mesh>
    </group>
  );
}

export const CUP_H = 1.2;
export const fillOf = (yld: number) => 0.15 + 0.85 * Math.min(1, yld / 80);
export const cupTop = (y: number, fill: number) => y - CUP_H / 2 + CUP_H * fill;

export function Cup({ y, fill, verdict, scale = 1, x = 0 }: {
  y: number; fill: number; verdict: Output['verdict']; scale?: number; x?: number;
}) {
  return (
    <group position={[x, y, 0]} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.85, 0.65, CUP_H, 24, 1, true]} />
        <meshToonMaterial color={tokens.metal} side={THREE.DoubleSide} />
      </mesh>
      <Hull scale={1.05}>
        <cylinderGeometry args={[0.85, 0.65, CUP_H, 24, 1, true]} />
      </Hull>
      <mesh position={[0, -CUP_H / 2 + (CUP_H * fill) / 2, 0]}>
        <cylinderGeometry args={[0.8, 0.66, CUP_H * fill, 24]} />
        <Toon color={tokens.espresso} />
      </mesh>
      <mesh position={[0, -CUP_H / 2 + CUP_H * fill + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 24]} />
        <meshBasicMaterial color={tokens.crema} />
      </mesh>
      <Face verdict={verdict} position={[0, 0.05, 0.79]} />
    </group>
  );
}

export const Stream = ({ x = 0, yTop, yBottom, r }: { x?: number; yTop: number; yBottom: number; r: number }) => (
  <mesh position={[x, (yTop + yBottom) / 2, 0]}>
    <cylinderGeometry args={[r, r, Math.max(0.01, yTop - yBottom), 10]} />
    <Toon color={tokens.espresso} />
  </mesh>
);

export const Crack = ({ x, w, len, y = 0, z = 0.1, thick = 0.5 }: { x: number; w: number; len: number; y?: number; z?: number; thick?: number }) =>
  w > 0.02 ? (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, len, thick]} />
      <meshBasicMaterial color={tokens.outline} />
    </mesh>
  ) : null;
