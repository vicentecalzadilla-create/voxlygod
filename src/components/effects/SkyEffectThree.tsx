import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface SkyEffectThreeProps {
  isPlaying: boolean;
}

// Soft round sprite texture generated once
function useSoftTexture() {
  return useMemo(() => {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,240,200,0.7)');
    g.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function CloudPuff({ position, scale, tint, speed, phase }: { position: [number, number, number]; scale: number; tint: THREE.Color; speed: number; phase: number; }) {
  const tex = useSoftTexture();
  const ref = useRef<THREE.Sprite>(null);
  const base = useRef(position[0]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const level = getAudioEffectsEngine().getLevel();
    ref.current.position.x = base.current + Math.sin(t * speed + phase) * (0.4 + level * 0.6);
    ref.current.position.y = position[1] + Math.cos(t * speed * 0.7 + phase) * 0.15;
    const s = scale * (1 + level * 0.06);
    ref.current.scale.set(s, s * 0.55, 1);
    (ref.current.material as THREE.SpriteMaterial).opacity = 0.55 + level * 0.25;
  });
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial map={tex} color={tint} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.7} />
    </sprite>
  );
}

function Particles({ count = 220 }: { count?: number }) {
  const tex = useSoftTexture();
  const ref = useRef<THREE.Points>(null);
  const { geometry, basePositions, speeds, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const gold = new THREE.Color('#ffd98a');
    const white = new THREE.Color('#fff7e0');
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      const c = Math.random() > 0.5 ? gold : white;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      sizes[i] = 0.05 + Math.random() * 0.12;
      speeds[i] = 0.15 + Math.random() * 0.4;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return { geometry, basePositions: positions.slice(), speeds, phases };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const level = getAudioEffectsEngine().getLevel();
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      pos.array[ix] = basePositions[ix] + Math.sin(t * speeds[i] + phases[i]) * (0.3 + level * 0.7);
      pos.array[ix + 1] = basePositions[ix + 1] + Math.cos(t * speeds[i] * 0.8 + phases[i]) * (0.25 + level * 0.5) + ((t * speeds[i] * 0.15) % 6 - 3) * 0.05;
    }
    pos.needsUpdate = true;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.7 + level * 0.3;
    mat.size = 0.18 + level * 0.12;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        map={tex}
        size={0.18}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.85}
      />
    </points>
  );
}

function GodRays() {
  const group = useRef<THREE.Group>(null);
  const tex = useSoftTexture();
  const rays = useMemo(() => [-0.5, -0.2, 0, 0.18, 0.45], []);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const level = getAudioEffectsEngine().getLevel();
    group.current.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.12 + Math.abs(Math.sin(t * 0.6 + i)) * 0.18 + level * 0.25;
    });
  });
  return (
    <group ref={group} position={[0, 2, -1]}>
      {rays.map((x, i) => (
        <mesh key={i} position={[x * 3, 0, 0]} rotation={[0, 0, x * 0.25]}>
          <planeGeometry args={[1.6, 9]} />
          <meshBasicMaterial
            map={tex}
            color={new THREE.Color('#fff2c8')}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

function SkyBackground() {
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[40, 24]} />
      <shaderMaterial
        transparent
        uniforms={{
          topColor: { value: new THREE.Color('#fff5dc') },
          midColor: { value: new THREE.Color('#fde4b8') },
          botColor: { value: new THREE.Color('#f3c98a') },
        }}
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `}
        fragmentShader={`
          varying vec2 vUv;
          uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;
          void main(){
            vec3 col = mix(botColor, midColor, smoothstep(0.0, 0.55, vUv.y));
            col = mix(col, topColor, smoothstep(0.55, 1.0, vUv.y));
            float vignette = smoothstep(1.1, 0.2, distance(vUv, vec2(0.5,0.6)));
            gl_FragColor = vec4(col, 0.55 * vignette);
          }
        `}
      />
    </mesh>
  );
}

const SkyEffectThree = ({ isPlaying }: SkyEffectThreeProps) => {
  const clouds = useMemo(() => {
    const tints = ['#ffffff', '#fff4d6', '#ffe9b5', '#fff8e7', '#f7dca0'];
    return Array.from({ length: 9 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.3) * 4 + 0.5,
        -1 - Math.random() * 2,
      ] as [number, number, number],
      scale: 3 + Math.random() * 3.5,
      tint: new THREE.Color(tints[i % tints.length]),
      speed: 0.08 + Math.random() * 0.12,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 1, transition: 'opacity 600ms ease' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ background: 'transparent' }}
        frameloop={isPlaying ? 'always' : 'demand'}
      >
        <SkyBackground />
        <GodRays />
        {clouds.map((c, i) => <CloudPuff key={i} {...c} />)}
        <Particles count={200} />
      </Canvas>
      {/* Soft top glow overlay for extra dreaminess */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 15%, hsl(45 100% 92% / 0.35), transparent 60%)',
        mixBlendMode: 'screen',
      }} />
    </div>
  );
};

export default SkyEffectThree;
