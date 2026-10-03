import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, UserRound, Users } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import form from "@/components/forms/CreationForm.module.css";
import styles from "./event-create.module.css";

export const metadata: Metadata = { title: "Create an event | Hackways" };

export default async function CreateEventPage({ searchParams }: {
  searchParams: Promise<{ communityId?: string }>;
}) {
  const { communityId } = await searchParams;
  if (communityId) redirect(`/events/create/details?communityId=${encodeURIComponent(communityId)}`);
  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={form.main}>
        <Link href="/my-events" className={form.back}><ArrowLeft size={15} />My events</Link>
        <header className={form.heading}><h1>Create an event</h1><p>Start with your hosting option.</p></header>
        <div className={styles.hostChoices}>
          <Link href="/events/create/details?host=solo" className={styles.hostChoice}>
            <UserRound size={24} strokeWidth={1.5} />
            <div><h2>Host solo</h2><p>Create an event under your own name.</p></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/events/create/community" className={styles.hostChoice}>
            <Users size={24} strokeWidth={1.5} />
            <div><h2>Host with your community</h2><p>Use an existing community or create a new one.</p></div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    </div>
  );
}
