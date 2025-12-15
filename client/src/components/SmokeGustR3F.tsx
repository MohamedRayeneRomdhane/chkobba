/* eslint-disable prettier/prettier */
/* eslint-disable react/no-unknown-property */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type SmokeGustR3FProps = {
  duration?: number;
  hold?: number;
  fadeInMs?: number;
  opacity?: number; // 0..1 base
  color?: string; // CSS color for smoke tint
  originXPercent?: number;
  originYPercent?: number;
  spread?: number; // size multiplier
  growthFrom?: number;
  growthTo?: number;
  riseVh?: number; // how far to rise in viewport-height units
  targetSelector?: string; // where to portal
  // Density and look controls
  layers?: number; // how many overlapping smoke planes
  noiseScale?: number; // frequency of noise (1.2-3.0)
  noiseSpeed?: number; // animation speed multiplier (0.06-0.25)
  alphaBoost?: number; // multiplies computed alpha (1.0-2.0)
  elongX?: number; // horizontal stretch for blob shape
  elongY?: number; // vertical stretch for blob shape
  widthFactor?: number; // plane width factor vs viewport
  heightFactor?: number; // plane height factor vs viewport
  onComplete?: () => void;
};

const frag = `
  precision highp float;
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_opacity;
  uniform vec3 u_color;
  uniform float u_noiseScale;
  uniform float u_blob;
  uniform float u_noiseSpeed;
  uniform float u_alphaBoost;
  uniform float u_seed;
  uniform float u_elongX;
  uniform float u_elongY;

  // 2D Simplex noise (ashima)
  vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec2 mod289(vec2 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);} 
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ; m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 uv){
    float f = 0.0;
    float a = 0.5;
    for(int i=0;i<5;i++){
      f += a * snoise(uv);
      uv *= 2.0; a *= 0.5;
    }
    return f;
  }

  void main(){
    // Elongation + animated fbm
    vec2 uv = vUv * vec2(u_elongX, u_elongY);
    float t = u_time * u_noiseSpeed;
    float n = fbm(uv * u_noiseScale + vec2(u_seed * 3.17, t));
    // Soft elliptical mask to make a blob shape
    vec2 c = uv - 0.5;
    float r = dot(c * vec2(0.9, 1.2), c * vec2(0.9, 1.2));
    // Fade out toward the edges; keep center opaque
    float mask = smoothstep(0.0, u_blob, r);
    float alpha = smoothstep(0.2, 0.75, n) * (1.0 - mask);
    alpha = clamp(alpha * u_alphaBoost, 0.0, 1.0);
    gl_FragColor = vec4(u_color, alpha * u_opacity);
  }
`;

const vert = `
  precision highp float;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function SmokePlane({
  baseOpacity,
  color,
  progress,
  seed,
  noiseScale,
  noiseSpeed,
  alphaBoost,
  elongX,
  elongY,
  widthFactor,
  heightFactor,
}: {
  baseOpacity: number;
  color: THREE.Color;
  progress: number;
  seed: number;
  noiseScale: number;
  noiseSpeed: number;
  alphaBoost: number;
  elongX: number;
  elongY: number;
  widthFactor: number;
  heightFactor: number;
}) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      u_time: { value: 0 },
      u_opacity: { value: 0 },
      u_color: { value: new THREE.Color(color) },
      u_noiseScale: { value: noiseScale },
      u_blob: { value: 0.7 },
      u_noiseSpeed: { value: noiseSpeed },
      u_alphaBoost: { value: alphaBoost },
      u_seed: { value: seed },
      u_elongX: { value: elongX },
      u_elongY: { value: elongY },
    },
    fragmentShader: frag,
    vertexShader: vert,
  }), [color, noiseScale, noiseSpeed, alphaBoost, seed, elongX, elongY]);

  useFrame((state, delta) => {
    mat.uniforms.u_time.value += delta;
    mat.uniforms.u_opacity.value = baseOpacity * progress;
  });

  const { viewport } = useThree();
  // Plane covers a chunk of the table; scale relative to viewport
  const width = viewport.width * widthFactor;
  const height = viewport.height * heightFactor;

  return (
    <mesh material={mat}>
      <planeGeometry args={[width, height, 1, 1]} />
    </mesh>
  );
}

function Scene({
  duration,
  hold,
  fadeInMs,
  opacity,
  color,
  riseVh,
  growthFrom,
  growthTo,
  layers,
  noiseScale,
  noiseSpeed,
  alphaBoost,
  elongX,
  elongY,
  widthFactor,
  heightFactor,
  onComplete,
}: Required<Pick<SmokeGustR3FProps, 'duration' | 'hold' | 'fadeInMs' | 'opacity' | 'color' | 'riseVh' | 'growthFrom' | 'growthTo' | 'layers' | 'noiseScale' | 'noiseSpeed' | 'alphaBoost' | 'elongX' | 'elongY' | 'widthFactor' | 'heightFactor' | 'onComplete'>>) {
  const group = React.useRef<THREE.Group>(null);
  const [phase, setPhase] = React.useState<'enter' | 'hold' | 'exit'>('enter');
  const start = React.useRef<number>(0);

  React.useEffect(() => {
    const now = performance.now();
    start.current = now;
    const enterTimer = setTimeout(() => setPhase('hold'), duration);
    const holdTimer = setTimeout(() => setPhase('exit'), duration + hold);
    const exitTimer = setTimeout(() => onComplete && onComplete(), duration + hold + duration * 0.6);
    return () => { clearTimeout(enterTimer); clearTimeout(holdTimer); clearTimeout(exitTimer); };
  }, [duration, hold, onComplete]);

  const { viewport } = useThree();
  const rise = (riseVh / 100) * viewport.height;

  useFrame(({ clock }) => {
    const t = (performance.now() - start.current) / 1000;
    const g = group.current;
    if (!g) return;
    // Timing (seconds)
    const enterSec = Math.max(0.001, fadeInMs / 1000);
    const holdSec = hold / 1000;
    const exitSec = (duration * 0.6) / 1000;
    const total = enterSec + holdSec + exitSec;
    const clamped = Math.min(t, total);

    // Upward motion based on total progress
    const totalP = clamped / total;
    g.position.y = totalP * rise;

    // Scale growth
    const growthP = clamped < enterSec
      ? clamped / enterSec
      : clamped < enterSec + holdSec
      ? 1
      : 1 - (clamped - enterSec - holdSec) / exitSec;
    const s = growthFrom + (growthTo - growthFrom) * Math.max(0, Math.min(growthP, 1));
    g.scale.setScalar(s);
  });

  // Opacity progress based on time (fade-in, hold, fade-out)
  const nowRef = React.useRef<number>(performance.now());
  const [progress, setProgress] = React.useState(0);
  useFrame(() => {
    const t = (performance.now() - start.current) / 1000;
    const enterSec = Math.max(0.001, fadeInMs / 1000);
    const holdSec = hold / 1000;
    const exitSec = (duration * 0.6) / 1000;
    const total = enterSec + holdSec + exitSec;
    const clamped = Math.min(t, total);

    let p = 0;
    if (clamped < enterSec) {
      p = Math.min(1, clamped / enterSec);
    } else if (clamped < enterSec + holdSec) {
      p = 1;
    } else {
      const outT = clamped - enterSec - holdSec;
      p = Math.max(0, 1 - outT / exitSec);
    }
    setProgress(p);
  });

  // Build seeds for each layer once
  const seeds = React.useMemo(() => Array.from({ length: layers }, (_, i) => 0.37 + i * 0.21), [layers]);

  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <group key={i} position={[ (i - (layers-1)/2) * 0.04 * viewport.width, 0, -i * 0.01 ]}>
          <SmokePlane
            baseOpacity={opacity * (layers > 1 ? 0.85 : 1)}
            color={new THREE.Color(color)}
            progress={progress}
            seed={s}
            noiseScale={noiseScale}
            noiseSpeed={noiseSpeed}
            alphaBoost={alphaBoost}
            elongX={elongX}
            elongY={elongY}
            widthFactor={widthFactor}
            heightFactor={heightFactor}
          />
        </group>
      ))}
    </group>
  );
}

export default function SmokeGustR3F({
  duration = 1800,
  hold = 300,
  fadeInMs = 450,
  opacity = 0.65,
  color = '#EAF0F6',
  originXPercent = 50,
  originYPercent = 98,
  spread = 1.0,
  growthFrom = 0.95,
  growthTo = 1.15,
  riseVh = 40,
  targetSelector,
  layers = 3,
  noiseScale = 1.8,
  noiseSpeed = 0.12,
  alphaBoost = 1.4,
  elongX = 1.2,
  elongY = 1.0,
  widthFactor = 1.0,
  heightFactor = 0.55,
  onComplete,
}: SmokeGustR3FProps) {
  const content = (
    <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen' }}>
      <div
        className="absolute"
        style={{
          left: `${originXPercent}%`,
          top: `${originYPercent}%`,
          transform: `translate(-50%, -50%) scale(${spread})`,
        }}
      >
        <div style={{ width: '60vmin', height: '40vmin', position: 'relative' }}>
          <Suspense fallback={null}>
            <Canvas
              gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
              dpr={[1, 2]}
              camera={{ position: [0, 0, 5], fov: 35 }}
              style={{ position: 'absolute', inset: 0, background: 'transparent' }}
            >
              <ambientLight intensity={0.3} />
              <Scene
                duration={duration}
                hold={hold}
                fadeInMs={fadeInMs}
                opacity={opacity}
                color={color}
                riseVh={riseVh}
                growthFrom={growthFrom}
                growthTo={growthTo}
                layers={layers}
                noiseScale={noiseScale}
                noiseSpeed={noiseSpeed}
                alphaBoost={alphaBoost}
                elongX={elongX}
                elongY={elongY}
                widthFactor={widthFactor}
                heightFactor={heightFactor}
                onComplete={onComplete || (() => {})}
              />
            </Canvas>
          </Suspense>
        </div>
      </div>
    </div>
  );

  if (targetSelector) {
    const target = typeof document !== 'undefined' ? document.querySelector(targetSelector) : null;
    if (target) return createPortal(content, target);
  }
  return content;
}
