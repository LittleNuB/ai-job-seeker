import { PathfinderShell } from "@/features/pathfinder/components";
import { PathfinderProvider } from "@/features/pathfinder/state";

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
