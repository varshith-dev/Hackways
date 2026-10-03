import React from "react";
import Link from "next/link";
import Logo3D from "@/components/ui/Logo3D";

export const PublicHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center group py-0.5" aria-label="Hackways Home">
          <Logo3D />
        </Link>
      </div>
    </header>
  );
};

export default PublicHeader;
