"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getStoredChannels } from "@/lib/api";
import type { Channel } from "@/lib/types";

export function useHostingCommunities() {
  const { user, isLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<{ userId: string | null; channels: Channel[]; error: string }>({
    userId: null, channels: [], error: "",
  });
  const load = useCallback(() => {
    if (isLoading) return;
    try {
      const channels = user ? getStoredChannels().filter((channel) =>
        channel.owner_id === user.userId || channel.members.some((member) =>
          (member.user_id === user.userId || member.email.toLowerCase() === user.email.toLowerCase()) &&
          ["owner", "admin", "host"].includes(member.role))
      ) : [];
      setSnapshot({ userId: user?.userId ?? "", channels, error: "" });
    } catch (cause) {
      console.error("Unable to load hosting communities", cause);
      setSnapshot({ userId: user?.userId ?? "", channels: [], error: "Your communities couldn't be loaded. Please retry." });
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Hydrate browser storage after auth resolves, and resync when the account changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const storage = (event: StorageEvent) => {
      if (event.key === "hackways_communities_v9" || event.key === null) load();
    };
    window.addEventListener("hackways_channels_updated", load);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("hackways_channels_updated", load);
      window.removeEventListener("storage", storage);
    };
  }, [load]);

  const ready = !isLoading && snapshot.userId === (user?.userId ?? "");
  return { user, ready, channels: ready ? snapshot.channels : [], error: ready ? snapshot.error : "", retry: load };
}
