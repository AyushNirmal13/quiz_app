import type { ReactNode } from "react";

import { Navbar, type NavKey } from "@/components/navigation/Navbar";

interface AppShellProps {
  activeNav?: NavKey;
  children: ReactNode;
}

export function AppShell({ activeNav = null, children }: AppShellProps) {
  return (
    <div className="app-root">
      <Navbar activeKey={activeNav} />
      <main className="app-shell">{children}</main>
    </div>
  );
}
