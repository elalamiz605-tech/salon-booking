"use client";

import { useEffect, useState } from "react";
import config from "@config";
import type { Locale } from "@/config/schema";
import { fill, getDict } from "@/i18n";
import { openingStatus } from "@/lib/opening-status";

/** Live "Open now · until 20:00" line, refreshed every minute. */
export function OpeningStatusText({ locale, initialNow }: { locale: Locale; initialNow: string }) {
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const t = getDict(locale);
  const s = openingStatus(now, config);
  const text = fill(t.status[s.key], { time: s.time, weekday: s.key === "opensOn" ? t.weekdays[s.weekday] : "" });
  return (
    <p className="hero-status">
      <span className={`hero-dot${s.open ? " open" : ""}`} />
      <span>{text}</span>
    </p>
  );
}
