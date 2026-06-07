import { PathfinderShell } from "@/features/pathfinder/components";
import { PathfinderProvider } from "@/features/pathfinder/state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "寻径星图",
  description: "OpenDocuments 工程企业知识库 AI 助手固定试航",
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
