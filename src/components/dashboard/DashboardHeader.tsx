import Link from "next/link";
import { UserNav } from "./UserNav";

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          
          <span className="text-2xl font-bold text-primary font-headline">ZYCLE</span>
        </Link>
        <UserNav />
      </div>
    </header>
  );
}
