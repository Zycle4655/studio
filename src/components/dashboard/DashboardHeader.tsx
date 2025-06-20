
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
        <div className="flex items-center gap-2 min-w-0"> {/* min-w-0 helps with truncation inside flex */}
          <SidebarTrigger className="md:hidden" /> 
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0"> {/* min-w-0 for the link too */}
            {companyName === null ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <span 
                className="text-2xl font-bold text-primary truncate block max-w-[180px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-xs" 
                title={companyName || undefined}
              >
                {companyName || " "} {/* Display a space if companyName is empty string to maintain layout */}
              </span>
            )}
          </Link>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
