import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
