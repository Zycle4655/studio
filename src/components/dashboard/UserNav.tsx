
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface UserNavProps {
  companyName?: string | null;
  logoUrl?: string | null;
}

export function UserNav({ companyName, logoUrl }: UserNavProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, permissions } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sesión Cerrada",
        description: "Ha cerrado sesión exitosamente.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Error al Cerrar Sesión",
        description: "No se pudo cerrar la sesión. Inténtelo de nuevo.",
      });
    }
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return <UserCircle size={20} />;
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            {logoUrl && <AvatarImage src={logoUrl} alt={companyName ? `Logo de ${companyName}` : "Logo de la empresa"} data-ai-hint="logo company" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user ? getInitials(user.email) : <UserCircle size={20} />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{companyName || user?.displayName || "Usuario ZYCLE"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || "cargando..."}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {permissions?.equipo && (
             <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
