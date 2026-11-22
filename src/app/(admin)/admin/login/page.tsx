import type { Metadata } from "next";
import config from "@config";
import { demoCredentials } from "@/server/auth";
import { isDemo } from "@/server/demo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="gutter mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 py-16">
      <div>
        <p className="font-display text-3xl italic">{config.name}</p>
        <p className="label mt-1">Salon dashboard</p>
      </div>
      <LoginForm demo={isDemo() ? demoCredentials() : null} />
    </main>
  );
}
