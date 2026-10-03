"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import Logo3D from "@/components/ui/Logo3D";
import styles from "./AppHeader.module.css";

export interface AppHeaderProps {
  theme?: "light" | "dark";
  transparent?: boolean;
  fixed?: boolean;
  eventNavigation?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme = "light",
  transparent = false,
  fixed = false,
  eventNavigation = false,
}) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isDark = theme === "dark";
  const isFixed = fixed || transparent;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header
      className={`${
        isFixed ? "fixed top-0 left-0 right-0" : "sticky top-0"
      } z-40 w-full transition-colors duration-300 ${
        isDark ? "text-white" : "text-zinc-900"
      }`}
    >
      {/* Background & Glass Diffusion Layer */}
      {transparent ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 select-none overflow-hidden -z-10">
          <div
            className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-b from-[#090a0b]/90 via-[#090a0b]/40 to-transparent"
                : "bg-gradient-to-b from-white/90 via-white/40 to-transparent"
            }`}
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              maskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
              transform: "translateZ(0)",
            }}
          />
        </div>
      ) : eventNavigation ? (
        <div className={styles.ambient} data-theme={theme} aria-hidden="true"
          style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      ) : (
        <div
          className={`absolute inset-0 -z-10 border-b backdrop-blur-md ${
            isDark
              ? "border-zinc-800/80 bg-[#090a0b]/90"
              : "border-zinc-200/80 bg-white/95"
          }`}
        />
      )}

      <div className="relative z-10 w-full flex h-16 items-center justify-between px-6 sm:px-10 lg:px-14">
        {/* Brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center group py-0.5" aria-label="Hackways Home">
            <Logo3D style={isDark ? { filter: "brightness(0) invert(1)" } : undefined} />
          </Link>
        </div>

        {/* User Identity: Minimal Profile Icon Only */}
        <div className="flex items-center gap-3 sm:gap-6">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={triggerRef}
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 active:scale-95 focus:outline-none ${
                  isDark
                    ? "bg-white text-zinc-950 hover:ring-2 hover:ring-zinc-400"
                    : "bg-zinc-950 text-white hover:ring-2 hover:ring-zinc-300"
                }`}
                aria-label="User Profile"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-controls={menuOpen ? "user-profile-menu" : undefined}
                title={user.name || "Profile"}
              >
                {user.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>

              {menuOpen && (
                <div
                  id="user-profile-menu"
                  className="absolute right-0 mt-1.5 min-w-44 rounded-lg bg-white border border-zinc-200 py-1 z-50 text-zinc-900"
                  style={{ animation: "fadeScale 120ms cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 8px 24px -12px rgba(20,20,24,.18)" }}
                >
                  <div className="px-3.5 py-2 border-b border-zinc-100 mb-1">
                    <p className="text-[13px] font-semibold text-zinc-950 truncate">{user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  </div>
                  {[
                    { href: "/home", label: "Discover" },
                    { href: "/my-events", label: "My events" },
                    { href: "/profile", label: "Account" },
                    { href: "/channels", label: "Communities" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-3.5 py-1.5 text-[13px] text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {(user.role === "organizer" || user.role === "admin") && (
                    <Link
                      href="/console"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3.5 py-1.5 text-[13px] text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 transition"
                    >
                      Console
                    </Link>
                  )}
                  <div className="mt-1 border-t border-zinc-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`rounded-full px-5 py-2 text-xs font-semibold transition shadow-xs ${
                isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-950 text-white hover:bg-zinc-800"
              }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
