"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().email("Enter a valid email address.");

type LoginFormProps = {
  initialError?: string;
};

const errorMessages: Record<string, string> = {
  configuration: "Authentication is not configured yet. Add your Supabase URL and anon key to .env.local, then restart the app.",
  session: "We couldn’t verify your session. Please request a new sign-in link.",
  verification: "That sign-in link could not be verified or has expired. Please request a new one.",
};

export function LoginForm({ initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError ? errorMessages[initialError] ?? errorMessages.verification : "");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    if (!supabaseConfigured) {
      setError(errorMessages.configuration);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: validation.data,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setSent(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not send the sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-violet-600">Secure Access</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">We’ll email you a one-time sign-in link.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="team@vesure.com"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-violet-500 focus:bg-white"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {sent && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Sign-in link sent. Open the email on this device to continue to the dashboard.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !supabaseConfigured}>
          {loading ? "Sending link..." : "Email me a sign-in link"}
        </Button>
      </form>
    </Card>
  );
}
