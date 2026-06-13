import { PathfinderShell } from "@/features/pathfinder/components";
import { PathfinderProvider } from "@/features/pathfinder/state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "寻径星图",
  description: "个人 AI 求职星图与适航成果包",
};

export default function PathfinderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PathfinderProvider>
      <PathfinderShell>{children}</PathfinderShell>
    </PathfinderProvider>
  );
}
