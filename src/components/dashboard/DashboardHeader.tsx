
import Link from "next/link";
import { UserNav } from "./UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar"; 
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeaderProps {
  companyName: string | null; 
}

export default function DashboardHeader({ companyName }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left side element for justify-between */}
        <div className="flex items-center"> {/* This div ensures SidebarTrigger is grouped */}
          <SidebarTrigger className="md:hidden" />
          {/* A small, non-obtrusive ZYCLE logo/icon could go here on desktop view if desired in the future */}
        </div>

        {/* Right side element for justify-between, containing Company Name and UserNav */}
        <div className="flex items-center gap-4"> {/* Gap between company name and user nav */}
          {/* Company Name Display (moved here) */}
          {companyName === null ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <Link href="/dashboard" className="flex items-center min-w-0"> {/* Link remains, min-w-0 for truncation */}
              <span
                className="text-xl font-semibold text-primary truncate block max-w-[150px] xs:max-w-[180px] sm:max-w-[220px] md:max-w-xs"
                title={companyName || undefined}
              >
                {companyName || " "}
              </span>
            </Link>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
