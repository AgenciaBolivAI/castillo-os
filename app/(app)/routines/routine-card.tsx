"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteRoutine,
  testRunRoutine,
  toggleRoutineActive,
} from "@/lib/actions";
import { RoutineForm } from "./routine-form";

export type Routine = {
  slug: string;
  name: string;
  description: string;
  steps: Record<string, unknown>[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function RoutineCard({ routine }: { routine: Routine }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(routine.active);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testDevice, setTestDevice] = useState("phonestream-desk");
  const [pending, start] = useTransition();

  const stepCount = Array.isArray(routine.steps) ? routine.steps.length : 0;

  function handleToggle() {
    const next = !active;
    setActive(next);
    start(async () => {
      await toggleRoutineActive(routine.slug, next);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete routine "${routine.slug}"? This can't be undone.`)) return;
    start(async () => {
      await deleteRoutine(routine.slug);
      router.refresh();
    });
  }

  function handleTest() {
    setTestResult("Running…");
    start(async () => {
      const r = await testRunRoutine(routine.slug, testDevice);
      if (r.error) setTestResult(`Failed: ${r.error}`);
      else if (r.queued === 0)
        setTestResult("Queued 0 steps — is the routine active?");
      else setTestResult(`Queued ${r.queued} step${r.queued === 1 ? "" : "s"} to ${testDevice}.`);
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      {/* Header row */}
      <div className="p-5 flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 text-left flex-1 group"
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                active ? "bg-green animate-pulse" : "bg-muted2"
              }`}
            />
            <code className="text-[11px] uppercase tracking-wide text-muted">
              {routine.slug}
            </code>
            <span className="text-[10px] text-muted2">·</span>
            <span className="text-[10px] text-muted2 tabular-nums">
              {stepCount} step{stepCount === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="font-display font-bold text-white group-hover:text-green transition-colors">
            {routine.name}
          </h3>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            {routine.description}
          </p>
        </button>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleToggle}
            disabled={pending}
            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
              active
                ? "border-green/40 text-green hover:bg-green/10"
                : "border-border-bright text-muted hover:text-text"
            }`}
          >
            {active ? "active" : "paused"}
          </button>
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-2 px-5 pb-4 border-t border-border pt-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs px-3 py-1.5 rounded-md border border-border-bright
                     text-muted hover:text-green hover:border-green transition-colors"
        >
          {expanded ? "Close" : "Edit"}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="text"
            value={testDevice}
            onChange={(e) => setTestDevice(e.target.value)}
            placeholder="device_id"
            className="text-[11px] px-2 py-1.5 rounded-md bg-bg border border-border
                       text-text/90 w-32 focus:border-green focus:outline-none"
          />
          <button
            onClick={handleTest}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md border border-border-bright
                       text-muted hover:text-green hover:border-green transition-colors
                       disabled:opacity-40"
          >
            Test fire
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md border border-border-bright
                       text-muted hover:text-red-400 hover:border-red-900 transition-colors
                       disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>

      {testResult ? (
        <div className="px-5 pb-4 text-[11px] text-muted">{testResult}</div>
      ) : null}

      {expanded ? (
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <RoutineForm
            mode="edit"
            initial={{
              slug: routine.slug,
              name: routine.name,
              description: routine.description,
              steps: routine.steps,
              active,
            }}
            originalSlug={routine.slug}
            onSaved={() => setExpanded(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
