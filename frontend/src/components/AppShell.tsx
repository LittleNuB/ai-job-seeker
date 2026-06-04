"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPathfinder = pathname.startsWith("/pathfinder");

  if (isPathfinder) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
