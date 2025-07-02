
"use client"; 

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar"; 
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"; 
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, companyProfile, loading } = useAuth();
  
  const isDashboardPage = pathname === '/dashboard';

  useEffect(() => {
    if (loading) {
      return; // Wait until auth state and profile are resolved
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!companyProfile && pathname !== "/profile-setup") {
      router.replace("/profile-setup");
    }
  }, [user, companyProfile, loading, router, pathname]);

  if (loading) { 
    return (
      <div className={cn(isDashboardPage && "dark")}>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <Skeleton className="h-8 w-24" /> 
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </header>
          <main className="flex-1 container py-8 px-4 md:px-6">
            <div className="mb-8">
              <Skeleton className="h-10 w-1/2 mb-2" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          </main>
        </div>
      </div>
    ); 
  }

  // If we are redirecting, we can return null to avoid flashing content.
  if (!user || (!companyProfile && pathname !== "/profile-setup")) {
    return null;
  }
  
  // The profile setup page has its own layout; don't wrap it with the dashboard UI.
  if (pathname === '/profile-setup') {
      return <>{children}</>;
  }

  return (
    <div className={cn(isDashboardPage && "dark")}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader companyName={companyProfile?.companyName || null} companyLogoUrl={companyProfile?.logoUrl || null} />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
