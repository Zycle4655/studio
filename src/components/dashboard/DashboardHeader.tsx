
import Link from "next/link";
import { UserNav } from "./UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar"; 
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeaderProps {
  companyName: string | null; 
  companyLogoUrl: string | null;
}

export default function DashboardHeader({ companyName, companyLogoUrl }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center"> 
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="flex items-center gap-4"> 
          {companyName === null ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <Link href="/dashboard" className="flex items-center min-w-0"> 
              <span
                className="text-xl font-semibold text-primary truncate block max-w-[150px] xs:max-w-[180px] sm:max-w-[220px] md:max-w-xs"
                title={companyName || undefined}
              >
                {companyName || " "}
              </span>
            </Link>
          )}
          <UserNav companyName={companyName} logoUrl={companyLogoUrl} />
        </div>
      </div>
    </header>
  );
}
