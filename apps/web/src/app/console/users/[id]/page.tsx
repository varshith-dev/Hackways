import React, { Suspense } from "react";
import UserDetailView from "./UserDetailView";

export const metadata = {
  title: "User Profile | User Management",
  description: "Dedicated user profile dashboard for inspecting account activity, passes, orders, and access control.",
};

export default function UserDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping" />
            <span>Loading user workspace...</span>
          </div>
        </div>
      }
    >
      <UserDetailView />
    </Suspense>
  );
}
