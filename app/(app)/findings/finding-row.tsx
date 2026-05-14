"use client";

import { useState, useTransition } from "react";
import { updateFindingStatus } from "@/lib/actions";

const IMPORTANCE_COLOR: Record<string, string> = {
  high: "text-red-400",
  medium: "text-green",
  low: "text-muted",
};

export type Finding = {
  id: string;
  title: string;
  detail: string | null;
  importance: string;
  status: string;
  created_at: string;
};

export function FindingRow({ finding }: { finding: Finding }) {
  const [status, setStatus] = useState(finding.status);
  const [pending, start] = useTransition();

  function set(next: string) {
    setStatus(next);
    start(() => updateFindingStatus(finding.id, next));
  }

  if (status === "dismissed") return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold ${
                IMPORTANCE_COLOR[finding.importance] ?? "text-muted"
              }`}
            >
              {finding.importance}
            </span>
            {status === "acted" ? (
              <span className="text-[10px] uppercase tracking-wider text-green">
                ✓ acted
              </span>
            ) : null}
          </div>
          <h3 className="font-display font-bold text-white">{finding.title}</h3>
          {finding.detail ? (
            <p className="text-sm text-muted mt-1 leading-relaxed">
              {finding.detail}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
        <button
          onClick={() => set("acted")}
          disabled={pending || status === "acted"}
          className="text-xs px-3 py-1.5 rounded-md border border-border-bright
                     text-muted hover:text-green hover:border-green transition-colors
                     disabled:opacity-40"
        >
          Marcar resuelto
        </button>
        <button
          onClick={() => set("dismissed")}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-md border border-border-bright
                     text-muted hover:text-red-400 hover:border-red-900 transition-colors
                     disabled:opacity-40"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
