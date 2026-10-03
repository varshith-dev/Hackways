import React from "react";
import Link from "next/link";
import Logo3D from "@/components/ui/Logo3D";

/*
 * Columns follow the landing spec: Product / Company / Legal.
 *
 * The spec also lists social links. There are no real Hackways accounts recorded
 * anywhere in this repo, and inventing URLs would ship dead links that look
 * official, so the row is left out until real handles exist. Everything needed
 * to add it is here — one array and a row.
 */

const PRODUCT = [
  { href: "/home", label: "Discover" },
  { href: "/channels", label: "Communities" },
  { href: "/for-organizers", label: "For Organizers" },
  { href: "/pricing", label: "Pricing" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/acceptable-use", label: "Acceptable Use" },
];

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="font-heading text-[13px] font-bold tracking-[-0.01em] text-caviar">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[13px] text-neutral-700 transition-colors hover:text-caviar">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-whiteout">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-8">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center" aria-label="Hackways home">
              <Logo3D />
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-neutral-700">
              The home for tech communities. Discover events, join communities, and bring
              people together.
            </p>
          </div>

          <Column title="Product" links={PRODUCT} />
          <Column title="Company" links={COMPANY} />
          <Column title="Legal" links={LEGAL} />
        </div>

        <div className="mt-14 border-t border-line pt-7">
          <p className="text-xs text-neutral-600">
            © {currentYear} Hackways. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
