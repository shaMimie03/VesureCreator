"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().email("Enter a valid email address.");

type LoginFormProps = {
  initialError?: string;
};

type Mode = "signin" | "invite" | "reset";

const errorMessages: Record<string, string> = {
  configuration: "Authentication is not configured. Check the Supabase URL and publishable key in the deployment settings.",
  session: "We couldn’t verify your session. Please sign in again.",
  verification: "That sign-in link could not be verified or has expired. Please request a new one.",
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-violet-500 focus:bg-white";

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ? errorMessages[initialError] ?? errorMessages.verification : "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setError(emailValidation.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    if (mode === "signin") {
      const passwordValidation = z
        .string()
        .min(1, "Enter your password.")
        .safeParse(password);
      if (!passwordValidation.success) {
        setError(passwordValidation.error.issues[0]?.message ?? "Enter your password.");
        return;
      }
    }

    if (!supabaseConfigured) {
      setError(errorMessages.configuration);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailValidation.data,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailValidation.data, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setMessage("If an account exists for this email, a password reset link has been sent.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setError("");
    setMessage("");
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
      const { error: signInError } = await createClient().auth.signInWithOtp({
        email: validation.data,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage("If this email belongs to an account, a sign-in link has been sent. Open the newest email on this device.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not send the sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === "invite" ? "Request an invitation" : mode === "reset" ? "Reset password" : "Sign in";
  const submitText = mode === "reset" ? "Send reset link" : "Sign in";

  return (
    <Card className="p-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-violet-600">Secure Access</p>
        <h1 className="mt-2 text-3xl font-bold">{heading}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "invite"
            ? "Access is limited to invited users to protect creator data. Ask the workspace administrator to invite your email in Supabase."
            : mode === "reset"
              ? "We’ll email you a secure link to choose a new password."
              : "Sign in to continue to your creator tracker."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {mode !== "invite" && (
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
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
              className={inputClassName}
            />
          </div>
        )}

        {mode === "signin" && (
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
          </div>
        )}

        {mode === "signin" && (
          <div className="text-right">
            <button type="button" className="text-sm font-medium text-violet-700 hover:text-violet-900" onClick={() => changeMode("reset")}>
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        {mode === "invite" ? (
          <Button type="button" className="w-full bg-violet-700 hover:bg-violet-600" onClick={() => changeMode("signin")}>
            Back to sign in
          </Button>
        ) : (
          <Button type="submit" className="w-full bg-violet-700 hover:bg-violet-600" disabled={loading || !supabaseConfigured}>
            {loading ? "Please wait..." : submitText}
          </Button>
        )}

        {mode === "signin" && (
          <button type="button" className="w-full text-sm font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50" onClick={sendMagicLink} disabled={loading || !supabaseConfigured}>
            Email me a sign-in link instead
          </button>
        )}

        <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
          {mode === "signin" ? (
            <>
              Need access?{" "}
              <button type="button" className="font-medium text-violet-700 hover:text-violet-900" onClick={() => changeMode("invite")}>
                Request an invitation
              </button>
            </>
          ) : (
            <>
              Already invited?{" "}
              <button type="button" className="font-medium text-violet-700 hover:text-violet-900" onClick={() => changeMode("signin")}>
                Sign in
              </button>
            </>
          )}
          {mode === "reset" && (
            <button type="button" className="mt-3 block w-full font-medium text-violet-700 hover:text-violet-900" onClick={() => changeMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
