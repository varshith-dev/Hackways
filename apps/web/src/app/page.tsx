import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  TicketIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  QrCodeIcon,
} from "@/components/icons/hugeicons";
import Logo3D from "@/components/ui/Logo3D";
import MobileNav from "@/components/layout/MobileNav";
import NavAuthMenu from "@/components/layout/NavAuthMenu";
import TextAnimate from "@/components/ui/TextAnimate";
import TextReveal from "@/components/ui/TextReveal";
import DrawIcon from "@/components/ui/DrawIcon";
import PublicFooter from "@/components/layout/PublicFooter";
import { BROWSE_CATEGORIES, categoryStyle } from "@/lib/eventCategories";

export const metadata: Metadata = {
  title: "Hackways — The home for tech communities",
  description:
    "Discover hackathons, meetups, and conferences. RSVP in seconds and follow the communities behind them.",
};

/*
 * Landing flow per spec, with no eyebrows, labels or tags anywhere — sections
 * are separated by headline scale and hairlines instead. The spec's eyebrow
 * lines ("THE HOME FOR TECH COMMUNITIES", "FOR ORGANIZERS") are therefore gone;
 * the brand statement they carried now lives only in the footer.
 *
 * Two sections in that spec were conditional and both conditions failed, so both
 * are absent rather than filled with invented data:
 *   - Proof strip ("[X] events hosted · [Y] communities"). No real platform-wide
 *     figures exist to quote.
 *   - Testimonials. No real organizer quotes yet (and since cut outright).
 *
 * The product visuals are SCHEMATIC: they show the real shape and chrome of each
 * surface using real platform vocabulary, with neutral bars standing in for
 * content. Nothing here invents an event name, a date, a count or a person.
 * Replace each with a real screenshot when there is one worth showing.
 */

/* --------------------------------------------------------------- recipes */

const SECTION = "mx-auto w-full max-w-6xl px-6";
const H2 =
  "font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-caviar sm:text-[2.6rem]";
const LEAD = "text-base leading-relaxed text-neutral-700";
const TEXT_ARROW =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-caviar transition-all hover:gap-2.5";

/* ------------------------------------------- schematic product fragments */

/** A neutral content bar. Stands in for text we have no real value for. */
function Bar({ w, dark }: { w: string; dark?: boolean }) {
  return (
    <span
      className={`block h-2 rounded-full ${dark ? "bg-neutral-300" : "bg-floatie"}`}
      style={{ width: w }}
      aria-hidden="true"
    />
  );
}

function PanelFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[18px] border border-line bg-white"
      role="img"
      aria-label={label}
    >
      {/* window chrome — signals "this is the product", not a decorative graphic */}
      <div className="flex items-center gap-1.5 border-b border-line bg-whiteout px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
      </div>
      {children}
    </div>
  );
}

/** Discover: the browse surface with its filter row and category chips. */
function DiscoverPanel() {
  return (
    <PanelFrame label="The Hackways discovery page, showing filters and category chips">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="h-9 flex-1 rounded-full border border-line bg-whiteout" aria-hidden="true" />
          <span className="h-9 w-24 rounded-full border border-line bg-whiteout" aria-hidden="true" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {BROWSE_CATEGORIES.slice(0, 5).map((name, i) => (
            <span
              key={name}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                i === 0 ? "accent-fill" : "bg-floatie text-neutral-700"
              }`}
            >
              {categoryStyle(name).label}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rise rounded-xl border border-line p-3"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="block h-16 rounded-lg bg-floatie" aria-hidden="true" />
              <span className="mt-3 block space-y-2">
                <Bar w="80%" dark />
                <Bar w="50%" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

/** RSVP: the registration flow, resolving to a confirmed pass. */
function RsvpPanel() {
  return (
    <PanelFrame label="The Hackways RSVP flow, from form to confirmed pass">
      <div className="p-5">
        <div className="space-y-2">
          <Bar w="60%" dark />
          <Bar w="38%" />
        </div>
        <div className="mt-5 space-y-2.5">
          <span className="block h-9 rounded-lg border border-line bg-whiteout" aria-hidden="true" />
          <span className="block h-9 rounded-lg border border-line bg-whiteout" aria-hidden="true" />
        </div>
        <span className="accent-control mt-4 flex h-10 items-center justify-center rounded-full text-xs font-bold">
          Confirm RSVP
        </span>
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-whiteout p-3.5">
          <TicketIcon size={18} className="shrink-0 text-caviar" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Bar w="55%" dark />
            <Bar w="35%" />
          </span>
          <ShieldCheckIcon size={16} className="shrink-0 text-neutral-500" />
        </div>
      </div>
    </PanelFrame>
  );
}

/** Communities: a community page with its follow action and upcoming list. */
function CommunityPanel() {
  return (
    <PanelFrame label="A Hackways community page with a Follow button and upcoming events">
      <div className="p-5">
        <div className="flex items-center gap-3.5">
          <span className="h-12 w-12 shrink-0 rounded-xl bg-floatie" aria-hidden="true" />
          <span className="min-w-0 flex-1 space-y-2">
            <Bar w="58%" dark />
            <Bar w="34%" />
          </span>
          <span className="accent-control shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold">
            Follow
          </span>
        </div>
        <div className="mt-6 border-t border-line">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rise flex items-center gap-3 border-b border-line py-3"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="h-8 w-8 shrink-0 rounded-lg bg-floatie" aria-hidden="true" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <Bar w="70%" dark />
                <Bar w="40%" />
              </span>
              <ChevronRightIcon size={14} className="shrink-0 text-neutral-500" />
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}


/* ------------------------------------------------------------------ page */

const STEPS = [
  {
    n: "01",
    title: "Create your event",
    body: "Name, date, location, capacity. Add a cover image if you want one — nothing else is required to publish.",
  },
  {
    n: "02",
    title: "Share the link",
    body: "Guests RSVP with a name and an email. No account, no download, no forms to fill in.",
  },
  {
    n: "03",
    title: "Check them in",
    body: "Scan each pass at the door from any phone. Check-ins sync across every device running the console.",
  },
];

/* Every claim below is enforced in code, not aspiration: remaining_capacity on
   the event record, ordered waitlist entries carrying a position, the
   waitlist_promoted broadcast, and a check-in that returns 409 "Already checked
   in at ..." when a pass is presented a second time. */
const CAPACITY_POINTS = [
  {
    Icon: ShieldCheckIcon,
    title: "Honest seat counts",
    body: "Remaining capacity is the real number. It is never padded to manufacture urgency.",
  },
  {
    Icon: RefreshCwIcon,
    title: "An ordered waitlist",
    body: "Once the last spot goes, requests join the waitlist in arrival order — and a drop-out promotes the next person automatically.",
  },
  {
    Icon: QrCodeIcon,
    title: "One scan per pass",
    body: "A pass that has already been used is refused at the door, along with the time it was first scanned.",
  },
];

const FAQS = [
  {
    q: "Do attendees need an account to RSVP?",
    a: "No. A name and an email is all it takes. The pass and its verification code are saved straight to their device.",
  },
  {
    q: "What happens when an event fills up?",
    a: "Capacity is enforced where the data lives, so a full event cannot be oversold. Further requests join the waitlist in the order they arrived, and each person can see their position.",
  },
  {
    q: "How does check-in work on the day?",
    a: "Open the console on any phone or laptop and scan each pass. If a pass has already been used it is refused, along with the time of the original scan.",
  },
  {
    q: "Can I host under a community instead of my own name?",
    a: "Yes. When you create an event you can host it as yourself or under a community you run — and you can start a new community right from that step.",
  },
  {
    q: "What does it cost?",
    a: "Creating an event and collecting free RSVPs costs nothing. Paid ticketing is available when you need it, with payouts, transactions and tax handling in the console.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-whiteout font-sans text-neutral-700 selection:bg-[#34349C] selection:text-white">
      <div className="hw-grain-overlay" aria-hidden="true" />

      {/* ----------------------------------------------------- 01. Navbar */}
      {/* Plain edge-to-edge strip, barely there: just blur and a translucent
          tint, no border, no drawn shadow line — nothing to read as a "bar".
          mix-blend-mode: difference was tried for adaptive nav-text color but
          the bg-white/40 tint washes out backdrop variation before the blend
          ever sees it, so against the hero's pale regions it computed
          near-white-on-white and faded out. Brand indigo instead: not the
          flat grey either, but a fixed color that's legible against every
          section this bar sticks over, image or page alike. */}
      <header className="sticky top-0 z-50 bg-white/40 backdrop-blur-xl">
        <div className={`${SECTION} flex h-16 items-center justify-between gap-6`}>
          {/* A plain anchor, not next/link: this is the homepage's own logo,
              so a Link to "/" while already on "/" is a same-URL no-op that
              does not scroll — a real page load always lands back at the
              hero. */}
          <a href="/" aria-label="Hackways home" className="flex items-center py-1">
            <Logo3D />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            <Link href="/home" className="text-[#34349C] transition-opacity hover:opacity-70">Discover</Link>
            <Link href="/channels" className="text-[#34349C] transition-opacity hover:opacity-70">Communities</Link>
            <Link href="/for-organizers" className="text-[#34349C] transition-opacity hover:opacity-70">For Organizers</Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Only alongside the full desktop nav (lg:flex above) — below lg,
                this lives in MobileNav's panel instead, so it has exactly
                one path onto the page at every width, not zero or two. */}
            <NavAuthMenu />
            <MobileNav />
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ------------------------------------------------------ 02. Hero */}
        {/* A card again: rounded, inset with margin, the photo filling it
            edge to edge. The image runs light-to-dark left to right rather
            than having one reliably pale corner, so a left-to-right scrim
            sits between it and the copy — white text everywhere, guaranteed
            legible regardless of which part of the image lands under it. */}
        <section className="px-3 pt-2 pb-6 sm:px-5 sm:pt-3 sm:pb-8">
          <div className="relative mx-auto flex min-h-[460px] w-full max-w-[1600px] items-center overflow-hidden rounded-[28px] lg:min-h-[640px]">
            <Image
              src="/hero-card-bg.png"
              alt=""
              fill
              priority
              quality={95}
              sizes="100vw"
              className="pointer-events-none select-none object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1a1a52]/70 via-[#1a1a52]/25 to-transparent" />

            <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 lg:max-w-[56%] lg:py-32">
              <h1 className="max-w-[17ch] font-heading text-[2.6rem] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[3.6rem] lg:text-[4rem]">
                Find something worth showing up for.
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
                Discover hackathons, meetups, and conferences. RSVP in seconds and
                follow the communities behind them.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/home"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#34349C] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90"
                >
                  Explore events
                  <ArrowRightIcon size={16} strokeWidth={2} />
                </Link>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 rounded-full border border-white px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-[#34349C]"
                >
                  Host an event
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 03. Proof strip — omitted. See the note at the top of this file. */}

        {/* ---- Discover + How it works, one continuous field. Light, not the
             dark indigo gradient this band used to carry — the ribbon pattern
             image is the only color here now, laid over the plain page
             background, with every text/chip color back to the page's normal
             light-surface set (H2/LEAD/TEXT_ARROW, caviar on white). ---- */}
        <div className="band-indigo relative isolate overflow-hidden">
        {/* -------------------------------------------------- 04. Discover */}
        <section className="py-24 sm:py-28">
          <div className={`${SECTION} rise`}>
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={H2}>Find something that fits.</TextAnimate>
                <p className={`${LEAD} mt-5 max-w-md`}>
                  Browse events by interest, location, and date, or jump straight to a
                  category.
                </p>

                <ul className="mt-8 flex flex-wrap gap-2">
                  {BROWSE_CATEGORIES.map((name) => (
                    <li key={name}>
                      <Link
                        href={`/home?category=${encodeURIComponent(name)}`}
                        className="inline-block rounded-full border border-[#34349C]/25 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#34349C] transition-colors hover:border-[#34349C]/50 hover:bg-white"
                      >
                        {categoryStyle(name).label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link href="/home" className={`${TEXT_ARROW} mt-8`}>
                  Browse all events
                  <ArrowRightIcon size={15} />
                </Link>
              </div>

              <div className="lg:col-span-6 lg:col-start-7">
                <DiscoverPanel />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------- How it works */}
        <section className="py-24 sm:py-28">
          <div className={`${SECTION} rise`}>
            <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={`${H2} max-w-xl`}>Three steps from idea to doorway.</TextAnimate>

            <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <li
                  key={step.n}
                  className="rise border-t border-[#34349C]/25 pt-6"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <span className="font-heading text-xs font-bold tracking-[0.2em] text-[#34349C]/85">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-heading text-lg font-bold tracking-[-0.02em] text-caviar">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-neutral-700">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        </div>

        {/* ------------------------------------- 05. RSVP + Communities */}
        <section className="border-t border-line py-24 sm:py-28">
          <div className={`${SECTION} rise`}>
            <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={`${H2} max-w-2xl`}>From saving a spot to staying in the loop.</TextAnimate>

            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-2">
              <div className="bg-white p-8 sm:p-10">
                <h3 className="font-heading text-xl font-bold tracking-[-0.025em] text-caviar">
                  Found it. Save your spot.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  RSVP in seconds and keep your tickets, details, and reminders in one
                  place.
                </p>
                <div className="mt-8">
                  <RsvpPanel />
                </div>
              </div>

              <div className="bg-white p-8 sm:p-10">
                <h3 className="font-heading text-xl font-bold tracking-[-0.025em] text-caviar">
                  Find your people.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  Follow the communities you care about, see what they&apos;re hosting
                  next, and stay connected beyond a single event.
                </p>
                <div className="mt-8">
                  <CommunityPanel />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The hinge from attending to hosting — one sentence, earned slowly */}
        <section className="border-t border-line">
          <TextReveal>
            Every community starts with one person deciding to bring people together.
          </TextReveal>
        </section>

        {/* For Organizers now lives at its own path (see /for-organizers) —
            the nav/footer link there directly instead of scrolling to an
            in-page anchor. */}

        {/* ------------------------------------------ Capacity & waitlist */}
        <section className="border-t border-line py-24 sm:py-28">
          <div className={`${SECTION} rise`}>
            <div className="max-w-2xl">
              <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={H2}>Nothing gets oversold.</TextAnimate>
              <p className={`${LEAD} mt-5`}>
                Capacity is enforced where the data lives, not in the browser. Even when a
                room full of people taps at the same instant, the last spot goes to
                exactly one of them.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {CAPACITY_POINTS.map(({ Icon, title, body }, i) => (
                <div
                  key={title}
                  className="rise border-t border-snow pt-6"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <DrawIcon>
                    <Icon size={18} className="text-caviar" />
                  </DrawIcon>
                  <h3 className="mt-3 font-heading text-base font-bold tracking-[-0.02em] text-caviar">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Pricing */}
        <section className="border-t border-line bg-white py-24 sm:py-28">
          <div className={`${SECTION} rise grid grid-cols-1 items-center gap-12 md:grid-cols-2`}>
            <div>
              <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={H2}>Free to start. Always.</TextAnimate>
              <p className={`${LEAD} mt-5 max-w-md`}>
                Creating an event and collecting free RSVPs costs nothing — no trial
                clock, no card on file. Paid ticketing is there when you need it, with
                payouts, transactions and tax handling built in.
              </p>
              <Link href="/pricing" className={`${TEXT_ARROW} mt-8`}>
                See pricing
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            <div className="surface p-9">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-[2.75rem] font-bold tracking-[-0.04em] text-caviar">
                  ₹0
                </span>
                <span className="text-sm text-neutral-600">to host a free event</span>
              </div>
              <ul className="mt-7 space-y-3 border-t border-line pt-6 text-sm text-neutral-700">
                <li>Unlimited free RSVPs</li>
                <li>Live capacity and an ordered waitlist</li>
                <li>Door check-in from any browser</li>
                <li>Your own community page</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- FAQ */}
        <section className="border-t border-line py-24 sm:py-28">
          <div className={`${SECTION} rise grid grid-cols-1 gap-12 md:grid-cols-12`}>
            <div className="md:col-span-4">
              <TextAnimate as="h2" by="word" animation="blurInUp" startOnView className={H2}>Questions, answered.</TextAnimate>
              <p className="mt-5 text-sm leading-relaxed text-neutral-700">
                Still stuck?{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-caviar underline decoration-snow decoration-2 underline-offset-4 transition-colors hover:decoration-caviar"
                >
                  Get in touch
                </Link>
                .
              </p>
            </div>

            <div className="border-t border-line md:col-span-7 md:col-start-6">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-caviar">
                      {faq.q}
                    </span>
                    <ChevronRightIcon
                      size={17}
                      className="shrink-0 text-neutral-500 transition-transform duration-300 group-open:rotate-90"
                    />
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-relaxed text-neutral-700">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 07. Testimonials — removed. */}

        {/* ------------------------------------------------- 08. Final CTA */}
        <section className={`${SECTION} py-24 sm:py-28`}>
          <div className="rise rounded-xl bg-[#34349C] px-6 py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-2xl font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-white sm:text-[2.6rem]">
              There&apos;s always something worth showing up for.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              Discover your next event or bring your own community together.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#34349C] transition-colors hover:bg-white/90"
              >
                Explore events
                <ArrowRightIcon size={16} strokeWidth={2} />
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Host an event
                <ArrowRightIcon size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
