"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/(admin)/admin/(protected)/actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

export const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <label htmlFor={id} className="text-sm">{label}</label>
    {children}
  </div>
);

const Select = ({ id, name, options, defaultValue }: { id: string; name: string; options: Option[]; defaultValue?: string }) => (
  <select id={id} name={name} defaultValue={defaultValue} className="input bg-ink">
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

function Errors({ state }: { state: FormState }) {
  if (!state.error) return null;
  return (
    <div role="alert" className="border border-[#f0a3a3] p-3 text-sm text-[#f0a3a3]">
      <p>{state.error}</p>
      {state.conflicts && <ul className="mt-2 list-disc pl-5">{state.conflicts.map((c) => <li key={c}>{c}</li>)}</ul>}
    </div>
  );
}

export function NewBookingForm({ action, services, barbers, date }: { action: Action; services: Option[]; barbers: Option[]; date: string }) {
  const [state, run, pending] = useActionState(action, { error: null });
  return (
    <form action={run} className="grid max-w-2xl gap-5 sm:grid-cols-2">
      <Field id="serviceId" label="Service"><Select id="serviceId" name="serviceId" options={services} /></Field>
      <Field id="barberId" label="Barber"><Select id="barberId" name="barberId" options={[{ value: "any", label: "Any barber" }, ...barbers]} /></Field>
      <Field id="date" label="Date"><input id="date" name="date" type="date" defaultValue={date} required className="input" /></Field>
      <Field id="time" label="Time"><input id="time" name="time" type="time" step={300} required className="input" /></Field>
      <Field id="name" label="Customer name"><input id="name" name="name" required className="input" /></Field>
      <Field id="phone" label="Phone"><input id="phone" name="phone" type="tel" className="input" /></Field>
      <Field id="email" label="Email (optional)"><input id="email" name="email" type="email" className="input" /></Field>
      <Field id="notes" label="Notes (optional)"><input id="notes" name="notes" className="input" /></Field>
      <div className="sm:col-span-2"><Errors state={state} /></div>
      <button type="submit" className="btn justify-self-start" disabled={pending}>{pending ? "Saving…" : "Create booking"}</button>
    </form>
  );
}

export function MoveForm({ action, barbers, date, time, barberId }: { action: Action; barbers: Option[]; date: string; time: string; barberId: string }) {
  const [state, run, pending] = useActionState(action, { error: null });
  return (
    <form action={run} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <Field id="move-date" label="New date"><input id="move-date" name="date" type="date" defaultValue={date} required className="input" /></Field>
      <Field id="move-time" label="New time"><input id="move-time" name="time" type="time" step={300} defaultValue={time} required className="input" /></Field>
      <Field id="move-barber" label="Barber"><Select id="move-barber" name="barberId" options={barbers} defaultValue={barberId} /></Field>
      <button type="submit" className="btn btn-sm" disabled={pending}>Move booking</button>
      <div className="sm:col-span-4"><Errors state={state} /></div>
    </form>
  );
}

export function BlockForm({ action, barbers, date }: { action: Action; barbers: Option[]; date: string }) {
  const [state, run, pending] = useActionState(action, { error: null });
  return (
    <form action={run} className="grid max-w-3xl gap-4 sm:grid-cols-3">
      <Field id="block-who" label="Who"><Select id="block-who" name="barberId" options={[{ value: "", label: "Whole salon" }, ...barbers]} /></Field>
      <Field id="block-date" label="Date"><input id="block-date" name="date" type="date" defaultValue={date} required className="input" /></Field>
      <Field id="block-reason" label="Reason"><input id="block-reason" name="reason" placeholder="Holiday, training…" className="input" /></Field>
      <Field id="block-from" label="From"><input id="block-from" name="from" type="time" step={300} required className="input" /></Field>
      <Field id="block-to" label="To"><input id="block-to" name="to" type="time" step={300} required className="input" /></Field>
      <button type="submit" className="btn btn-sm self-end" disabled={pending}>Add time off</button>
      <div className="sm:col-span-3"><Errors state={state} /></div>
    </form>
  );
}

/** A destructive action with an inline second step instead of a browser dialog. */
export function ConfirmButton({ action, id, label, confirmLabel, question }: { action: (f: FormData) => Promise<void>; id: string; label: string; confirmLabel: string; question: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(true)}>{label}</button>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border border-[var(--line)] p-3 text-sm">
      <input type="hidden" name="id" value={id} />
      <span>{question}</span>
      <button type="submit" className="btn btn-sm">{confirmLabel}</button>
      <button type="button" className="link-underline" onClick={() => setAsking(false)}>Keep</button>
    </form>
  );
}
