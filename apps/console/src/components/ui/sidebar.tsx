"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";

/* Composable sidebar (shadcn-style API, dependency-free):
   Provider state, icon-rail collapse, edge rail, trigger, keyboard shortcut. */

const SIDEBAR_STORAGE_KEY = "console_sidebar_collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children, defaultCollapsed = false }: { children: ReactNode; defaultCollapsed?: boolean }) {
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      // Restore the persisted rail preference after mount (browser-only storage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setCollapsedState(stored === "true");
    } catch {}
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    } catch {}
  }, []);

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const value = useMemo(() => ({ collapsed, toggle, setCollapsed }), [collapsed, toggle, setCollapsed]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function Sidebar({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={`hidden lg:flex shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out overflow-hidden ${
        collapsed ? "w-14" : "w-64"
      } ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`shrink-0 px-2 pt-3 pb-2 ${className}`} {...props} />;
}

export function SidebarContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-1 [scrollbar-width:thin] ${className}`}
      {...props}
    />
  );
}

export function SidebarFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`shrink-0 border-t border-zinc-100 px-2 py-2 ${className}`} {...props} />;
}

export function SidebarGroup({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`py-1 ${className}`} {...props} />;
}

export function SidebarGroupLabel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const { collapsed } = useSidebar();
  if (collapsed) return null;
  return (
    <div
      className={`px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-heading ${className}`}
      {...props}
    />
  );
}

export function SidebarMenu({ className = "", ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={`flex flex-col gap-0.5 ${className}`} {...props} />;
}

export function SidebarMenuItem({ className = "", ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={`list-none ${className}`} {...props} />;
}

interface SidebarMenuButtonProps {
  href?: string;
  isActive?: boolean;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
}

export function SidebarMenuButton({ href, isActive, icon, label, onClick }: SidebarMenuButtonProps) {
  const { collapsed } = useSidebar();
  const classes = `group relative flex items-center rounded-md text-[13px] transition-colors min-h-9 ${
    collapsed ? "justify-center px-0" : "gap-3 px-2.5"
  } ${
    isActive
      ? "bg-zinc-100 text-zinc-950 font-semibold"
      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 font-normal"
  }`;
  const content = (
    <>
      <span className={`shrink-0 flex items-center justify-center ${isActive ? "text-zinc-950" : "text-zinc-400 group-hover:text-zinc-700"}`}>
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-current={isActive ? "page" : undefined} title={collapsed ? label : undefined} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-current={isActive ? "page" : undefined} title={collapsed ? label : undefined} className={`${classes} w-full`}>
      {content}
    </button>
  );
}

export function SidebarRail() {
  const { toggle, collapsed } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title="Toggle sidebar (Ctrl+B)"
      className="absolute top-0 -right-2 z-20 hidden lg:block h-full w-4 cursor-ew-resize after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:-translate-x-1/2 after:bg-transparent hover:after:bg-zinc-300 after:transition-colors"
    />
  );
}

export function SidebarTrigger({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle, collapsed } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-keyshortcuts="Control+B"
      className={`hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer ${className}`}
      {...props}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="9.5" y1="4" x2="9.5" y2="20" />
      </svg>
    </button>
  );
}

export function SidebarInset({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`relative flex-1 min-w-0 flex flex-col ${className}`} {...props} />;
}
