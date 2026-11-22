"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ demo }: { demo: { email: string; password: string } | null }) {
  const [state, action, pending] = useActionState(loginAction, { error: null, email: demo?.email ?? "" });
  const error = state.error;
  return (
    <form action={action} className="flex flex-col gap-5">
      {demo && (
        <div className="border border-[var(--line)] p-4 text-sm">
          <p className="label mb-2">Demo access</p>
          <p>Email: <span className="select-all">{demo.email}</span></p>
          <p>Password: <span className="select-all">{demo.password}</span></p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required key={state.email} defaultValue={state.email} className="input" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo?.password} className="input" />
      </div>
      {error && <p role="alert" className="text-sm text-[#f0a3a3]">{error}</p>}
      <button type="submit" className="btn self-start" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
