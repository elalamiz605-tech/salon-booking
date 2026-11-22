"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelAction } from "./actions";

/** Cancel with an inline confirmation step (no browser dialogs). */
export function CancelButton({ token, locale, labels }: { token: string; locale: string; labels: { cancel: string; ask: string; yes: string; no: string } }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!asking) return <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)}>{labels.cancel}</button>;
  return (
    <div className="flex flex-wrap items-center gap-4 border border-[var(--line)] p-4">
      <p className="w-full text-sm">{labels.ask}</p>
      <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { await cancelAction(token, locale); router.refresh(); })}>{labels.yes}</button>
      <button type="button" className="link-underline" onClick={() => setAsking(false)}>{labels.no}</button>
    </div>
  );
}
