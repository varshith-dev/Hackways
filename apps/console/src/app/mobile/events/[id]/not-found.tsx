import Link from "next/link";

export default function EventModuleNotFound() {
  return (
    <section className="mobile-console-message">
      <h1>Module not found</h1>
      <p>Choose an event module from the menu, or return to your events.</p>
      <Link href="/console/organizer/events">My events</Link>
    </section>
  );
}
