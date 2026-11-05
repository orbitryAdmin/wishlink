"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth-actions";
import { SubmitButton } from "./submit-button";

export function AdminLoginForm() {
  const [state, formAction] = useActionState(signIn, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={256}
          className="field"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className="field"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
