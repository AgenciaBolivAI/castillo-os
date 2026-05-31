"use client";

import { useEffect, useState } from "react";

/**
 * Big tracking-spaced clock in the HUD top bar. Updates once per second.
 * Stamps America/La_Paz so the wall TV reads in local time regardless
 * of where the browser is.
 */
export function HudClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/La_Paz",
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-display text-base text-text tracking-[0.3em] tabular-nums">
      {now || "--:--:--"}
    </span>
  );
}
