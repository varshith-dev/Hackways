import React from "react";
import SuperAdminView, { SuperAdminTab } from "../SuperAdminView";

export default async function SuperAdminTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  return <SuperAdminView activeTab={(tab as SuperAdminTab) || "overview"} />;
}
