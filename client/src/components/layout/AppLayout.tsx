import { ReactNode } from "react";
import Navbar from "@/components/navigation/Navbar";
import { NotificationProvider } from "@/hooks/use-notifications";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-neoloc-background">
        <Navbar />
        <main className="pb-6">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}