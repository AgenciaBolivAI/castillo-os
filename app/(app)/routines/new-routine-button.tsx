"use client";

import { useState } from "react";
import { RoutineForm } from "./routine-form";

const TEMPLATE = {
  slug: "",
  name: "",
  description: "",
  steps: [
    { kind: "tts_speak", payload: { text: "Routine running." } },
  ],
  active: true,
} as const;

export function NewRoutineButton() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="w-full bg-card border border-green/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-white">New routine</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
        <RoutineForm
          mode="create"
          initial={{
            slug: TEMPLATE.slug,
            name: TEMPLATE.name,
            description: TEMPLATE.description,
            steps: TEMPLATE.steps as unknown as Record<string, unknown>[],
            active: TEMPLATE.active,
          }}
          onSaved={() => setOpen(false)}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="text-xs px-3 py-2 rounded-md border border-border-bright bg-card
                 text-text/90 hover:text-green hover:border-green active:bg-card/80 transition-colors"
    >
      + New routine
    </button>
  );
}
