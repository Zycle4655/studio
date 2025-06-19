import Link from "next/link";
import { UserNav } from "./UserNav";
import ZycleIcon from "@/components/icons/ZycleIcon";

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ZycleIcon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">ZYCLE</span>
        </Link>
        <UserNav />
      </div>
    </header>
  );
}
