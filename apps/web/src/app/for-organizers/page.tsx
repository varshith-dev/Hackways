import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";
import TextAnimate from "@/components/ui/TextAnimate";
import DrawIcon from "@/components/ui/DrawIcon";
import { ArrowRightIcon, ZapIcon, UsersGroupIcon, TicketIcon } from "@/components/icons/hugeicons";

export const metadata: Metadata = {
  title: "For Organizers — Hackways",
  description:
    "Everything you need to publish an event, manage who's coming, and grow your audience over time.",
};

const H2 =
  "font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-caviar sm:text-[2.6rem]";
const LEAD = "text-base leading-relaxed text-neutral-700";
const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-[#34349C] px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-[#2c2c85]";

const ORGANIZER_CAPABILITIES = [
  { Icon: ZapIcon, title: "Publish.", body: "Create an event page and go live in minutes." },
  {
    Icon: UsersGroupIcon,
    title: "Manage.",
    body: "Track RSVPs, approve attendees, and message everyone in one place.",
  },
  {
    Icon: TicketIcon,
    title: "Grow.",
    body: "Build a following that carries over from one event to the next.",
  },
];

function Bar({ w, dark }: { w: string; dark?: boolean }) {
  return (
    <span
      className={`block h-2 rounded-full ${dark ? "bg-neutral-300" : "bg-floatie"}`}
      style={{ width: w }}
      aria-hidden="true"
    />
  );
}

function PanelFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[18px] border border-line bg-white"
      role="img"
      aria-label={label}
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-whiteout px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
      </div>
      {children}
    </div>
  );
}

/** Organizers: the dashboard — stat tiles over the RSVP list. */
function OrganizerPanel() {
  return (
    <PanelFrame label="The Hackways organizer dashboard, showing event stats and the RSVP list">
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rise rounded-xl border border-line p-3.5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <Bar w="55%" />
              <span className="mt-2.5 block h-5 w-12 rounded bg-neutral-300" aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-line">
          <div className="flex items-center gap-3 border-b border-line bg-whiteout px-3.5 py-2.5">
            <span className="flex-1"><Bar w="30%" /></span>
            <span className="w-16"><Bar w="100%" /></span>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rise flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="h-7 w-7 shrink-0 rounded-full bg-floatie" aria-hidden="true" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <Bar w="62%" dark />
                <Bar w="38%" />
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                  i < 2 ? "accent-fill" : "bg-floatie text-neutral-600"
                }`}
              >
                {i < 2 ? "Going" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

export default function ForOrganizersPage() {
  return (
    <PublicSiteLayout>
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <TextAnimate as="h1" by="word" animation="blurInUp" className={H2}>
              Bring your community together.
            </TextAnimate>
            <p className={`${LEAD} mt-5 max-w-md`}>
              Everything you need to publish an event, manage who&apos;s coming, and grow
              your audience over time.
            </p>

            <ul className="mt-10 space-y-7 border-t border-snow pt-8">
              {ORGANIZER_CAPABILITIES.map(({ Icon, title, body }, i) => (
                <li
                  key={title}
                  className="rise flex gap-4"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <DrawIcon>
                    <Icon size={20} className="mt-0.5 shrink-0 text-caviar" />
                  </DrawIcon>
                  <p className="text-sm leading-relaxed text-neutral-700">
                    <strong className="font-heading font-bold text-caviar">{title}</strong>{" "}
                    {body}
                  </p>
                </li>
              ))}
            </ul>

            <Link href="/create" className={`${BTN_PRIMARY} mt-10`}>
              Host an event
              <ArrowRightIcon size={16} strokeWidth={2} />
            </Link>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <OrganizerPanel />
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}
