"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense } from "react";
import { BrainScene } from "./brain-3d";
import { AgentsScene } from "./agents-3d";
import { useHudStream } from "./use-hud-stream";
import type { SeedEvent } from "./activity-feed";

/**
 * Fullscreen Three.js canvas wrapping the brain particle field, the
 * labeled lobes, the connecting edges, and the animated agent orbs.
 * Also owns the SSE subscription (single connection per page).
 */
export function HudCanvas({ seed }: { seed: SeedEvent[] }) {
  // One SSE connection feeds both the activity feed and the agent
  // animations. Mounting here so the canvas + feed render against the
  // same store.
  useHudStream(seed);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 5.2], fov: 45 }}
      >
        <color attach="background" args={["#080b09"]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#00e5a0" />
        <pointLight position={[-5, -3, -2]} intensity={0.4} color="#7dd3fc" />

        <Suspense fallback={null}>
          <BrainScene />
          <AgentsScene />
        </Suspense>

        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.7}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
