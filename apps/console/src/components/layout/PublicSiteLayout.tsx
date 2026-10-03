import React from "react";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

interface PublicSiteLayoutProps {
  children: React.ReactNode;
}

export const PublicSiteLayout: React.FC<PublicSiteLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-950 selection:text-white">
      <PublicHeader />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter />
    </div>
  );
};
export default PublicSiteLayout;
