"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleIcon } from "@/components/icons/hugeicons";
import Logo3D from "@/components/ui/Logo3D";
import { InlineSkeleton } from "@/components/ui/Skeleton";
import { safeRedirectTarget } from "@/lib/redirect";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured yet. Use email to continue.",
  google_state_mismatch: "That Google sign-in link expired. Please try again.",
  google_token_exchange_failed: "Google sign-in didn't complete. Please try again.",
  google_unreachable: "Couldn't reach Google. Please try again.",
  google_profile_failed: "Couldn't read your Google profile. Please try again.",
  google_email_unverified: "That Google account's email isn't verified.",
  google_account_failed: "Couldn't create your account. Please try again.",
  account_service_unavailable: "Account service is unavailable. Please try again shortly.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectTarget(searchParams.get("redirect"));
  const googleError = searchParams.get("error");
  const { user, login, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => (googleError && GOOGLE_ERROR_MESSAGES[googleError]) || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError("");
    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Unable to sign in");
      return;
    }

    // If no explicit redirect was requested, route admins straight to the
    // super-admin dashboard instead of the generic home page.
    const hasExplicitRedirect = redirectTarget !== "/home";
    if (!hasExplicitRedirect && result.user?.role === "admin") {
      router.push("/console/super-admin/overview");
    } else {
      router.push(redirectTarget);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/v1/auth/google?redirect=${encodeURIComponent(redirectTarget)}`;
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand & Heading */}
      <div className="text-center mb-8 flex flex-col items-center">
        <Link href="/" className="inline-flex items-center mb-4 group" aria-label="Hackways Home">
          <Logo3D />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
          Sign in to Hackways
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-xs">
          Access your reserved event passes, live drops, and organizer dashboard.
        </p>
      </div>

      {user && (
        <div className="mb-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-zinc-900">Signed in as {user.email}</p>
            <p className="text-zinc-500 mt-0.5">Role: <span className="font-mono uppercase text-zinc-700">{user.role}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={redirectTarget || "/home"}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition"
            >
              Continue
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-medium hover:bg-zinc-100 transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs sm:text-sm font-semibold hover:border-zinc-300 transition active:scale-[0.99]"
      >
        <GoogleIcon size={18} />
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200" />
        </div>
        <div className="relative flex justify-center text-xs text-zinc-400">
          <span className="bg-[#fafafa] px-3 font-medium">or continue with email</span>
        </div>
      </div>

      {/* Email & Password Form */}
      <form onSubmit={handleCustomLogin} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="text-xs font-semibold text-zinc-700 block mb-1.5">Email address</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-zinc-700">Password</label>
            <button
              type="button"
              onClick={() => setError("Please contact your administrator or support at support@hackways.com to reset your credentials, or sign in using Google.")}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-950 transition"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-zinc-400 hover:text-zinc-700 transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-1 rounded-full bg-zinc-950 py-3 px-5 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {/* Footer Switcher */}
      <div className="text-center mt-7 text-xs text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-zinc-950 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#fafafa] font-sans">
      <Suspense fallback={<InlineSkeleton lines={3} />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
