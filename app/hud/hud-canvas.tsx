"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense } from "react";
import { BrainScene } from "./brain-3d";
import { AgentsScene } from "./agents-3d";
import { useHudStream, useHudStreamStore } from "./use-hud-stream";
import type { SeedEvent } from "./activity-feed";

/**
 * Fullscreen Three.js canvas wrapping the brain particle field, the
 * labeled lobes, the connecting edges, and the animated agent orbs.
 * Also owns the SSE subscription (single connection per page).
 *
 * Camera: OrbitControls — mouse-wheel zooms, drag rotates. Auto-rotate
 * continues idle so the wall TV demo still looks alive. Clicking
 * empty space deselects whichever lobe/agent was inspected.
 */
export function HudCanvas({ seed }: { seed: SeedEvent[] }) {
  // One SSE connection feeds both the activity feed and the agent
  // animations. Mounting here so the canvas + feed render against the
  // same store.
  useHudStream(seed);
  const clearSelected = useHudStreamStore((s) => s.setSelected);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 5.2], fov: 45 }}
        onPointerMissed={() => clearSelected(null)}
      >
        <color attach="background" args={["#080b09"]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#00e5a0" />
        <pointLight position={[-5, -3, -2]} intensity={0.4} color="#7dd3fc" />

        <Suspense fallback={null}>
          <BrainScene />
          <AgentsScene />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          enablePan={false}
          minDistance={3}
          maxDistance={9}
          // Constrain vertical so users can't flip upside-down on a wall TV.
          minPolarAngle={Math.PI * 0.18}
          maxPolarAngle={Math.PI * 0.82}
          // Camera auto-orbits when nobody is touching the mouse — replaces
          // the old internal brain rotation. Pauses while the user drags.
          autoRotate
          autoRotateSpeed={0.35}
          makeDefault
        />

        <EffectComposer>
          <Bloom
            intensity={2.2}
            luminanceThreshold={0.08}
            luminanceSmoothing={0.85}
            mipmapBlur
            radius={0.9}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
