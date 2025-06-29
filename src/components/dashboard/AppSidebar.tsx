
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
  Receipt,
  Truck,
  HandCoins,
  UserCog,
  MessageSquareQuote,
  Landmark,
  Calculator,
  MapPin,
  MapPinned,
  History,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const pathname = usePathname();
  const { open: sidebarOpen } = useSidebar();
  const { permissions, collaboratorId } = useAuth(); // Get user permissions from context

  const [gestionMaterialOpen, setGestionMaterialOpen] = React.useState(
    isModulePathActive('/dashboard/gestion-material')
  );
  const [transporteOpen, setTransporteOpen] = React.useState(
    isModulePathActive('/dashboard/transporte')
  );
  const [reportesOpen, setReportesOpen] = React.useState(
    isModulePathActive('/dashboard/reportes')
  );
  const [suiOpen, setSuiOpen] = React.useState(
    isModulePathActive('/dashboard/sui')
  );
  const [talentoHumanoOpen, setTalentoHumanoOpen] = React.useState(
    isModulePathActive('/dashboard/talento-humano') || isModulePathActive('/dashboard/equipo')
  );
  const [contabilidadOpen, setContabilidadOpen] = React.useState(
    isModulePathActive('/dashboard/contabilidad')
  );

  function isModulePathActive(basePath: string) {
    return pathname.startsWith(basePath);
  }

  // Update open state if path changes
  React.useEffect(() => {
    setGestionMaterialOpen(isModulePathActive('/dashboard/gestion-material'));
    setTransporteOpen(isModulePathActive('/dashboard/transporte'));
    setReportesOpen(isModulePathActive('/dashboard/reportes'));
    setSuiOpen(isModulePathActive('/dashboard/sui'));
    setTalentoHumanoOpen(isModulePathActive('/dashboard/talento-humano') || isModulePathActive('/dashboard/equipo'));
    setContabilidadOpen(isModulePathActive('/dashboard/contabilidad'));
  }, [pathname]);


  const isActive = (path: string) => pathname.startsWith(path) && (pathname === path || pathname.startsWith(`${path}/`));
  const isExactActive = (path: string) => pathname === path;
  

  // Tooltip texts (only shown when sidebar is collapsed to icons)
  const dashboardTooltip = sidebarOpen ? undefined : "Dashboard";
  const gestionMaterialTooltip = sidebarOpen ? undefined : "Gestión de Material";
  const transporteTooltip = sidebarOpen ? undefined : "Transporte";
  const reportesTooltip = sidebarOpen ? undefined : "Reportes";
  const suiTooltip = sidebarOpen ? undefined : "SUI";
  const talentoHumanoTooltip = sidebarOpen ? undefined : "Talento Humano";
  const contabilidadTooltip = sidebarOpen ? undefined : "Contabilidad";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isExactActive('/dashboard')}
              tooltip={dashboardTooltip}
            >
              <Link href="/dashboard">
                <Home />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Gestión de Material Module */}
          {permissions?.gestionMaterial && (
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
                    {/* EN BODEGA Sub-group */}
                    <div className="mt-1 mb-1 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70">
                      En Bodega
                    </div>
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

                    {/* EN FUENTE Sub-group */}
                    <div className="mt-2 mb-1 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70">
                      En Fuente
                    </div>
                     <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isExactActive('/dashboard/gestion-material/en-fuente')}
                    >
                        <Link href="/dashboard/gestion-material/en-fuente">
                        <MapPin />
                        <span>Registrar Recolección</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                     <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isActive('/dashboard/gestion-material/en-fuente/fuentes')}
                    >
                        <Link href="/dashboard/gestion-material/en-fuente/fuentes">
                        <MapPinned />
                        <span>Gestionar Fuentes</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isActive('/dashboard/gestion-material/en-fuente/historial')}
                    >
                        <Link href="/dashboard/gestion-material/en-fuente/historial">
                        <History />
                        <span>Historial</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          )}

           {/* Contabilidad Module */}
          {permissions?.contabilidad && (
            <SidebarMenuItem>
                <SidebarMenuButton
                onClick={() => setContabilidadOpen(!contabilidadOpen)}
                isActive={isModulePathActive('/dashboard/contabilidad')}
                tooltip={contabilidadTooltip}
                >
                <Landmark />
                <span>Contabilidad</span>
                <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                    contabilidadOpen ? 'rotate-180' : ''
                    }`}
                />
                </SidebarMenuButton>
                {contabilidadOpen && (
                <SidebarMenuSub>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isActive('/dashboard/contabilidad/arqueo-caja')}
                    >
                        <Link href="/dashboard/contabilidad/arqueo-caja">
                        <Calculator />
                        <span>Arqueo de Caja</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isActive('/dashboard/contabilidad/historial-arqueo')}
                    >
                        <Link href="/dashboard/contabilidad/historial-arqueo">
                        <History />
                        <span>Historial de Arqueos</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          )}

          {/* Transporte Module */}
          {permissions?.transporte && (
            <SidebarMenuItem>
                <SidebarMenuButton
                onClick={() => setTransporteOpen(!transporteOpen)}
                isActive={isModulePathActive('/dashboard/transporte')}
                tooltip={transporteTooltip}
                >
                <Truck />
                <span>Transporte</span>
                <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                    transporteOpen ? 'rotate-180' : ''
                    }`}
                />
                </SidebarMenuButton>
                {transporteOpen && (
                <SidebarMenuSub>
                    <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                        asChild
                        isActive={isActive('/dashboard/transporte/vehiculos')}
                    >
                        <Link href="/dashboard/transporte/vehiculos">
                        <Truck />
                        <span>Vehículos</span>
                        </Link>
                    </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          )}
          
          {/* Reportes Module */}
          {permissions?.reportes && (
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
          )}
          
          {/* SUI Module */}
          {permissions?.sui && (
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
          )}
          
          {/* Fused Talento Humano & Equipo Module */}
          {(permissions?.talentoHumano || permissions?.equipo || collaboratorId) && (
            <SidebarMenuItem>
                <SidebarMenuButton
                onClick={() => setTalentoHumanoOpen(!talentoHumanoOpen)}
                isActive={isModulePathActive('/dashboard/talento-humano') || isModulePathActive('/dashboard/equipo')}
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
                    {permissions?.equipo && (<>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                                asChild
                                isActive={isActive('/dashboard/equipo')}
                            >
                                <Link href="/dashboard/equipo">
                                <Users />
                                <span>Colaboradores</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                                asChild
                                isActive={isActive('/dashboard/equipo/cargos')}
                            >
                                <Link href="/dashboard/equipo/cargos">
                                <Briefcase />
                                <span>Gestionar Cargos</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    </>)}
                    {(permissions?.talentoHumano || collaboratorId) && (<>
                        <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                            asChild
                            isActive={isActive('/dashboard/talento-humano/prestamos')}
                        >
                            <Link href="/dashboard/talento-humano/prestamos">
                            <HandCoins />
                            <span>Préstamos</span>
                            </Link>
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
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
                                isActive={isActive('/dashboard/talento-humano/pqs')}
                            >
                                <Link href="/dashboard/talento-humano/pqs">
                                <MessageSquareQuote />
                                <span>PQS</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                              asChild
                              isActive={isActive('/dashboard/talento-humano/certificados')}
                          >
                              <Link href="/dashboard/talento-humano/certificados">
                              <FileBadge />
                              <span>Certificados</span>
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
                    </>)}
                </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          )}

        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
