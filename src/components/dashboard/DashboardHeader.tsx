
import Link from "next/link";
import { UserNav } from "./UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar"; // Importar SidebarTrigger

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"> {/* z-index ajustado por si acaso */}
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" /> {/* Se muestra en mobile, oculto en md+ */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* <ZycleIcon className="h-8 w-8 text-primary" /> ZycleIcon ya fue removido */}
            <span className="text-2xl font-bold text-primary">ZYCLE</span>
          </Link>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
