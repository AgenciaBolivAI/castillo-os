"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

// react-force-graph-2d touches `window` — load it client-only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export type GraphNode = {
  id: string;
  name: string;
  type: string;
  mention_count: number;
  color: string;
};

export type GraphLink = {
  source: string;
  target: string;
  relation: string;
  weight: number;
};

export function BrainGraph({
  nodes,
  links,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hover, setHover] = useState<GraphNode | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // react-force-graph mutates the data objects, so hand it fresh copies.
  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links],
  );

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-[60vh] sm:h-[70vh] md:h-[calc(100vh-10rem)] rounded-xl border border-border bg-card overflow-hidden touch-none"
    >
      <ForceGraph2D
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="#0e120f"
        nodeId="id"
        nodeRelSize={4}
        nodeVal={(n: any) => 1 + Math.log2(1 + (n.mention_count || 1)) * 2}
        nodeColor={(n: any) => n.color || "#00e5a0"}
        nodeLabel={(n: any) => `${n.name} · ${n.type}`}
        linkColor={() => "rgba(74,94,76,0.5)"}
        linkWidth={(l: any) => 0.5 + Math.min(l.weight || 1, 6) * 0.4}
        linkDirectionalParticles={0}
        onNodeHover={(n: any) => setHover(n || null)}
        onNodeClick={(n: any) => setHover(n || null)}
        onBackgroundClick={() => setHover(null)}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(n: any, ctx, scale) => {
          // draw the label only when zoomed in enough to keep it readable
          if (scale < 0.9) return;
          const label = n.name as string;
          ctx.font = `${11 / scale}px Instrument Sans, sans-serif`;
          ctx.fillStyle = "#d4e0d5";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, n.x, n.y + 6);
        }}
        cooldownTicks={120}
      />

      {/* legend / hover readout */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto text-xs text-muted bg-dark/80 backdrop-blur px-3 py-2 rounded-lg border border-border">
        {hover ? (
          <span className="text-text">
            <span className="text-white font-medium">{hover.name}</span>
            <span className="text-muted2"> · {hover.type}</span>
            <span className="text-muted2"> · {hover.mention_count}×</span>
          </span>
        ) : (
          <span>
            <span className="hidden sm:inline">
              {nodes.length} entidades · {links.length} relaciones — pasa el
              cursor o toca un nodo
            </span>
            <span className="sm:hidden">
              {nodes.length} entidades · toca un nodo
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
