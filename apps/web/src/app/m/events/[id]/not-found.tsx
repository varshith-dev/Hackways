import Link from "next/link";

export default function MobileEventNotFound() {
  return (
    <section className="p-8 text-center space-y-3">
      <h1 className="text-lg font-semibold text-zinc-900">Module not found</h1>
      <p className="text-xs text-zinc-500">Choose an event module from the navigation, or return to your mobile console.</p>
      <Link href="/m" className="inline-block px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-medium">
        Back to Mobile Console
      </Link>
    </section>
  );
}
