
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
  BarChart3, 
  Recycle, 
  FileBadge, 
  Briefcase, 
  Users, 
  Weight, 
  UsersRound, 
  CalendarCheck, 
  Receipt 
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function AppSidebar() {
  const pathname = usePathname();
  const { open: sidebarOpen } = useSidebar();

  const [gestionMaterialOpen, setGestionMaterialOpen] = React.useState(
    isModulePathActive('/dashboard/gestion-material')
  );
  const [reportesOpen, setReportesOpen] = React.useState(
    isModulePathActive('/dashboard/reportes')
  );
  const [suiOpen, setSuiOpen] = React.useState(
    isModulePathActive('/dashboard/sui')
  );
  const [talentoHumanoOpen, setTalentoHumanoOpen] = React.useState(
    isModulePathActive('/dashboard/talento-humano')
  );

  function isModulePathActive(basePath: string) {
    return pathname.startsWith(basePath);
  }

  // Update open state if path changes
  React.useEffect(() => {
    setGestionMaterialOpen(isModulePathActive('/dashboard/gestion-material'));
    setReportesOpen(isModulePathActive('/dashboard/reportes'));
    setSuiOpen(isModulePathActive('/dashboard/sui'));
    setTalentoHumanoOpen(isModulePathActive('/dashboard/talento-humano'));
  }, [pathname]);


  const isActive = (path: string) => pathname === path;
  

  // Tooltip texts (only shown when sidebar is collapsed to icons)
  const dashboardTooltip = sidebarOpen ? undefined : "Dashboard";
  const gestionMaterialTooltip = sidebarOpen ? undefined : "Gestión de Material";
  const reportesTooltip = sidebarOpen ? undefined : "Reportes";
  const suiTooltip = sidebarOpen ? undefined : "SUI";
  const talentoHumanoTooltip = sidebarOpen ? undefined : "Talento Humano";


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

          {/* Gestión de Material Module */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setGestionMaterialOpen(!gestionMaterialOpen)}
              isActive={isModulePathActive('/dashboard/gestion-material')}
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

          {/* Reportes Module */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setReportesOpen(!reportesOpen)}
              isActive={isModulePathActive('/dashboard/reportes')}
              tooltip={reportesTooltip}
            >
              <BarChart3 />
              <span>Reportes</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                  reportesOpen ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {reportesOpen && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/reportes/toneladas-aprovechadas')}
                  >
                    <Link href="/dashboard/reportes/toneladas-aprovechadas">
                      <Recycle />
                      <span>Toneladas Aprovechadas</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/reportes/certificados')}
                  >
                     <Link href="/dashboard/reportes/certificados">
                      <FileBadge />
                      <span>Certificados</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>

          {/* SUI Module */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSuiOpen(!suiOpen)}
              isActive={isModulePathActive('/dashboard/sui')}
              tooltip={suiTooltip}
            >
              <Briefcase />
              <span>SUI</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                  suiOpen ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {suiOpen && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/sui/asociados')}
                  >
                    <Link href="/dashboard/sui/asociados">
                      <Users />
                      <span>Asociados</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/sui/balance-masas')}
                  >
                     <Link href="/dashboard/sui/balance-masas">
                      <Weight />
                      <span>Balance de Masas</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>

          {/* Talento Humano Module */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTalentoHumanoOpen(!talentoHumanoOpen)}
              isActive={isModulePathActive('/dashboard/talento-humano')}
              tooltip={talentoHumanoTooltip}
            >
              <UsersRound />
              <span>Talento Humano</span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                  talentoHumanoOpen ? 'rotate-180' : ''
                }`}
              />
            </SidebarMenuButton>
            {talentoHumanoOpen && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/talento-humano/control-asistencia')}
                  >
                    <Link href="/dashboard/talento-humano/control-asistencia">
                      <CalendarCheck />
                      <span>Control Asistencia</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive('/dashboard/talento-humano/desprendibles-pago')}
                  >
                     <Link href="/dashboard/talento-humano/desprendibles-pago">
                      <Receipt />
                      <span>Desprendibles de Pago</span>
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
