import React from "react";
import TeamView from "../TeamView";

export default async function TeamTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  return <TeamView currentTab={tab || "overview"} />;
}
