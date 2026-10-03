import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

export default function MobileConsoleNotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
        <CalendarDays size={24} />
      </div>
      <h2 className="text-base font-semibold text-zinc-950">Module or Event not found</h2>
      <p className="text-xs text-zinc-500 mt-1 max-w-xs">
        The requested event or module does not exist or has been relocated.
      </p>
      <Link
        href="/m/console"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-medium"
      >
        <ArrowLeft size={14} />
        <span>Return to Mobile Console</span>
      </Link>
    </div>
  );
}
