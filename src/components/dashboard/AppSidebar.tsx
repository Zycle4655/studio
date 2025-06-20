
"use client";

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  Package,
  ShoppingCart,
  Store,
  Boxes,
  Warehouse,
  FileText,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function AppSidebar() {
  const pathname = usePathname();
  const [gestionMaterialOpen, setGestionMaterialOpen] = React.useState(true);
  const { open: sidebarOpen } = useSidebar();

  const isActive = (path: string) => pathname === path;
  const isGestionMaterialPath = (path: string) => pathname.startsWith(path);

  const dashboardTooltip = sidebarOpen ? undefined : "Dashboard";
  const gestionMaterialTooltip = sidebarOpen ? undefined : "Gestión de Material";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard')}
              tooltip={dashboardTooltip}
            >
              <Link href="/dashboard">
                <Home />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setGestionMaterialOpen(!gestionMaterialOpen)}
              isActive={isGestionMaterialPath('/dashboard/gestion-material')}
              tooltip={gestionMaterialTooltip}
            >
              <Package />
              <span>Gestión de Material</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                  gestionMaterialOpen ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {gestionMaterialOpen && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/compras')}
                  >
                    <Link href="/dashboard/gestion-material/compras">
                      <ShoppingCart />
                      <span>Compra de Material</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/ventas')}
                  >
                     <Link href="/dashboard/gestion-material/ventas">
                      <Store />
                      <span>Venta de Material</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/materiales')}
                  >
                    <Link href="/dashboard/gestion-material/materiales">
                      <Boxes />
                      <span>Materiales</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/inventario')}
                  >
                    <Link href="/dashboard/gestion-material/inventario">
                      <Warehouse />
                      <span>Inventario</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/facturas-compra')}
                  >
                    <Link href="/dashboard/gestion-material/facturas-compra">
                      <FileText />
                      <span>Facturas Compra</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/gestion-material/facturas-venta')}
                  >
                    <Link href="/dashboard/gestion-material/facturas-venta">
                      <FileText />
                      <span>Facturas Venta</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
          
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
