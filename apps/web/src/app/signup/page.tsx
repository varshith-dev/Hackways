"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { GoogleIcon } from "@/components/icons/hugeicons";
import Logo3D from "@/components/ui/Logo3D";
import { InlineSkeleton } from "@/components/ui/Skeleton";
import { safeRedirectTarget } from "@/lib/redirect";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-up is not configured yet. Use email to continue.",
  google_state_mismatch: "That Google sign-up link expired. Please try again.",
  google_token_exchange_failed: "Google sign-up didn't complete. Please try again.",
  google_unreachable: "Couldn't reach Google. Please try again.",
  google_profile_failed: "Couldn't read your Google profile. Please try again.",
  google_email_unverified: "That Google account's email isn't verified.",
  google_account_failed: "Couldn't create your account. Please try again.",
  account_service_unavailable: "Account service is unavailable. Please try again shortly.",
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectTarget(searchParams.get("redirect"));
  const googleError = searchParams.get("error");
  const { signup } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(() => (googleError && GOOGLE_ERROR_MESSAGES[googleError]) || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your name."); return; }
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) return;
    if (confirmPassword !== password) {
      setError("Passwords don't match.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await signup(email.trim(), password, name.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Unable to create account");
      return;
    }
    router.push(redirectTarget);
  };

  const handleGoogleSignup = () => {
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
          {step === 1 ? "Create your account" : "Confirm your password"}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-xs">
          {step === 1
            ? "Reserve high-demand event drops or host your own community gatherings."
            : `Re-enter your password for ${email} to finish creating your account.`}
        </p>
      </div>

      {step === 1 && (
        <>
          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs sm:text-sm font-semibold hover:border-zinc-300 transition active:scale-[0.99]"
          >
            <GoogleIcon size={18} />
            <span>Sign up with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs text-zinc-400">
              <span className="bg-[#fafafa] px-3 font-medium">or register with email</span>
            </div>
          </div>

          {/* Step 1: name, email, password */}
          <form onSubmit={handleContinue} className="space-y-5">
            <div>
              <label htmlFor="signup-name" className="text-xs font-semibold text-zinc-700 block mb-1.5">Full name</label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Elena Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="text-xs font-semibold text-zinc-700 block mb-1.5">Email address</label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="elena@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="text-xs font-semibold text-zinc-700 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
              className="w-full mt-1 rounded-full bg-zinc-950 py-3 px-5 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800 transition active:scale-[0.99]"
            >
              Continue
            </button>
          </form>

          <p className="mt-5 text-[11px] text-zinc-400 text-center leading-relaxed">
            By continuing, you agree to Hackways&apos;s Terms of Service and Privacy Policy.
          </p>
        </>
      )}

      {step === 2 && (
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="signup-confirm-password" className="text-xs font-semibold text-zinc-700 block mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                autoFocus
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-zinc-400 hover:text-zinc-700 transition"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setConfirmPassword("");
              setStep(1);
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition"
          >
            <ArrowLeft size={13} />
            Back
          </button>
        </form>
      )}

      {/* Footer Link */}
      <div className="text-center mt-7 text-xs text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-zinc-950 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#fafafa] font-sans">
      <Suspense fallback={<InlineSkeleton lines={3} />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
