import { AGENT_BY_SLUG } from "./lobes";

type FleetRow = {
  slug: string | null;
  name: string | null;
  role: string | null;
  ep: number | null;
  ent: number | null;
  find: number | null;
  ds: number | null;
  last_tick_at: string | null;
  last_deep_sleep_at: string | null;
};

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card/85 backdrop-blur border border-border-bright rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-[0.25em] text-muted">
        <span>{title}</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
      </div>
      {children}
    </div>
  );
}

function Last7Days({
  weekCount,
  findingsCount,
}: {
  weekCount: number;
  findingsCount: number;
}) {
  return (
    <Panel title="Last 7 days">
      <Row label="New episodes" value={weekCount} />
      <Row label="Active findings" value={findingsCount} />
      <Row label="Status" value="nominal" valueClass="text-green" />
    </Panel>
  );
}

function AgentRoster({ fleet, error }: { fleet: FleetRow[]; error: string | null }) {
  if (error) {
    return (
      <Panel title="Agent fleet">
        <p className="text-xs text-red-400">{error}</p>
      </Panel>
    );
  }
  if (!fleet.length) {
    return (
      <Panel title="Agent fleet" className="flex-1 min-h-0">
        <p className="text-xs text-muted">No agents yet.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Agent fleet" className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 -mr-1 pr-1">
        {fleet.map((a) => {
          const visual = a.slug ? AGENT_BY_SLUG[a.slug] : undefined;
          const dot = visual?.color ?? "#4a5e4c";
          return (
            <div
              key={a.slug ?? a.name ?? Math.random()}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: dot, boxShadow: `0 0 6px ${dot}` }}
              />
              <span className="font-display font-bold text-text uppercase tracking-wider">
                {a.name ?? a.slug}
              </span>
              <span className="ml-auto text-muted2 tabular-nums">
                {a.ep ?? 0}·{a.ent ?? 0}·{a.find ?? 0}·{a.ds ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SystemStatus() {
  return (
    <Panel title="System">
      <Row label="Brain" value="online" valueClass="text-green" />
      <Row label="Wake word" value="hey atlas" valueClass="text-green" />
      <Row label="Voice" value="standby" />
      <Row label="Web search" value="enabled" valueClass="text-green" />
    </Panel>
  );
}

function Row({
  label,
  value,
  valueClass = "text-text",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-display font-bold uppercase tracking-wider tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export const StatusPanels = {
  Last7Days,
  AgentRoster,
  SystemStatus,
};
