
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { List, PieChart as PieChartIcon, FileText, Eye, Landmark, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, Timestamp } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { FacturaVentaDocument } from "@/schemas/venta";
import type { CajaDiariaDocument } from "@/schemas/caja";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";


interface DashboardData {
  inventoryDetails: MaterialDocument[];
  totalInventoryWeight: number;
  lastInvoices: FacturaCompraDocument[];
  cajaDiaria: (CajaDiariaDocument & {
    totalVentasEfectivo?: number;
    totalComprasEfectivo?: number;
    totalVentasNequi?: number;
    totalComprasNequi?: number;
  }) | null;
}

export default function DashboardPage() {
  const { companyOwnerId, permissions } = useAuth();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const fetchDashboardData = React.useCallback(async () => {
    if (!companyOwnerId || !db) return;

    setIsLoading(true);
    try {
      // Fetch materials for inventory chart
      const materialsRef = collection(db, "companyProfiles", companyOwnerId, "materials");
      const materialsSnapshot = await getDocs(query(materialsRef, orderBy("stock", "desc")));
      const materialsList = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialDocument));
      const totalInventoryWeight = materialsList.reduce((sum, mat) => sum + (mat.stock || 0), 0);
      
      // Fetch last 5 purchase invoices
      const invoicesRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
      const invoicesQuery = query(invoicesRef, orderBy("fecha", "desc"), limit(5));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const lastInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacturaCompraDocument));

      // Fetch daily cash box data if user has permissions
      let cajaDiariaData: DashboardData['cajaDiaria'] = null;
      if (permissions?.contabilidad) {
        const todayId = new Date().toISOString().split('T')[0];
        const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
        const cajaSnap = await getDoc(cajaRef);

        if (cajaSnap.exists()) {
            const data = cajaSnap.data() as CajaDiariaDocument;
            
            const startOfDay = Timestamp.fromDate(new Date(todayId + "T00:00:00"));
            const endOfDay = Timestamp.fromDate(new Date(todayId + "T23:59:59"));

            const comprasRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
            const qCompras = query(comprasRef, where("fecha", ">=", startOfDay), where("fecha", "<=", endOfDay));
            const comprasSnap = await getDocs(qCompras);
            const allComprasDocs = comprasSnap.docs.map(d => d.data() as FacturaCompraDocument)
            
            const totalComprasEfectivo = allComprasDocs
                .filter(d => d.formaDePago === 'efectivo')
                .reduce((sum, d) => sum + (d.netoPagado || 0), 0);

            const totalComprasNequi = allComprasDocs
                .filter(d => d.formaDePago === 'nequi')
                .reduce((sum, d) => sum + (d.netoPagado || 0), 0);

            const ventasRef = collection(db, "companyProfiles", companyOwnerId, "saleInvoices");
            const qVentas = query(ventasRef, where("fecha", ">=", startOfDay), where("fecha", "<=", endOfDay));
            const ventasSnap = await getDocs(qVentas);
            const allVentasDocs = ventasSnap.docs.map(d => d.data() as FacturaVentaDocument)

            const totalVentasEfectivo = allVentasDocs
                .filter(d => d.formaDePago === 'efectivo')
                .reduce((sum, d) => sum + (d.totalFactura || 0), 0);
            
             const totalVentasNequi = allVentasDocs
                .filter(d => d.formaDePago === 'nequi')
                .reduce((sum, d) => sum + (d.totalFactura || 0), 0);
            
            const saldoEsperado = (data.baseInicial || 0) + totalVentasEfectivo + (data.totalIngresosAdicionales || 0) - totalComprasEfectivo - (data.totalGastos || 0);

            cajaDiariaData = { 
                ...data, 
                totalVentasEfectivo: totalVentasEfectivo,
                totalComprasEfectivo: totalComprasEfectivo,
                totalVentasNequi: totalVentasNequi,
                totalComprasNequi: totalComprasNequi,
                saldoEsperado: saldoEsperado 
            };
        }
      }

      setData({
        inventoryDetails: materialsList,
        totalInventoryWeight: totalInventoryWeight,
        lastInvoices: lastInvoices,
        cajaDiaria: cajaDiariaData,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, permissions]);

  React.useEffect(() => {
    document.title = 'Dashboard | Zycle';
    if (companyOwnerId) {
      fetchDashboardData();
    }
  }, [companyOwnerId, fetchDashboardData]);

  const chartData = data?.inventoryDetails.filter(d => (d.stock || 0) > 0).slice(0, 5) || [];
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Material
              </span>
              <span className="font-bold text-muted-foreground">
                {data.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Stock
              </span>
              <span className="font-bold">
                {formatWeight(data.stock)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };


  if (isLoading) {
    return (
       <div className="container py-8 px-4 md:px-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-3/5 mb-3" />
          <Skeleton className="h-6 w-4/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
        </div>
      </div>
    )
  }


  return (
    <div className="container py-8 px-4 md:px-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white font-headline">Dashboard</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Un resumen en tiempo real de la operación de su empresa.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
         {data && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {data.inventoryDetails.length > 0 && data.totalInventoryWeight > 0 ? (
                  <>
                    <Card className="shadow-lg bg-white text-gray-900">
                      <CardHeader>
                        <CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5 text-primary"/>Top 5 Materiales por Stock</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }}/>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              innerRadius={80}
                              outerRadius={120}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="stock"
                              nameKey="name"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend
                                iconSize={10}
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                wrapperStyle={{ lineHeight: '24px', paddingLeft: '20px' }}
                                formatter={(value) => <span className="text-sm">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card className="shadow-lg bg-white text-gray-900">
                      <CardHeader>
                        <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Últimas 5 Facturas de Compra</CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[350px] overflow-y-auto">
                        {data.lastInvoices.length > 0 ? (
                          <Table>
                              <TableHeader>
                              <TableRow>
                                  <TableHead>N°</TableHead>
                                  <TableHead>Proveedor</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-center">Ver</TableHead>
                              </TableRow>
                              </TableHeader>
                              <TableBody>
                              {data.lastInvoices.map((invoice) => (
                                  <TableRow key={invoice.id}>
                                      <TableCell className="font-medium">{invoice.numeroFactura}</TableCell>
                                      <TableCell>{invoice.proveedorNombre || 'General'}</TableCell>
                                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.totalFactura)}</TableCell>
                                      <TableCell className="text-center">
                                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                              <Link href={`/dashboard/gestion-material/facturas-compra/${invoice.id}/edit`}>
                                                  <Eye className="h-4 w-4" />
                                              </Link>
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                              </TableBody>
                          </Table>
                          ) : (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-10">
                              <p>No se encontraron facturas de compra recientes.</p>
                          </div>
                          )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="shadow-lg text-center py-12 md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-white">Sin Datos de Inventario</CardTitle>
                        <CardDescription>
                            No hay stock en el inventario para mostrar análisis.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground mt-2">Registre su inventario inicial o su primera compra para ver los gráficos.</p>
                      </CardContent>
                  </Card>
                )}
              </div>
              
              {permissions?.contabilidad && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center text-white">
                            <Landmark className="mr-2 h-5 w-5 text-primary"/>Resumen de Caja del Día
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.cajaDiaria ? (
                            data.cajaDiaria.estado === 'Abierta' ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Base Inicial</span><span className="font-semibold">{formatCurrency(data.cajaDiaria.baseInicial)}</span></div>
                                    <div className="flex justify-between items-baseline"><span className="text-sm text-green-500">Ventas Efectivo</span><span className="font-semibold text-green-500">+ {formatCurrency(data.cajaDiaria.totalVentasEfectivo ?? 0)}</span></div>
                                    <div className="flex justify-between items-baseline"><span className="text-sm text-red-500">Compras Efectivo</span><span className="font-semibold text-red-500">- {formatCurrency(data.cajaDiaria.totalComprasEfectivo ?? 0)}</span></div>
                                    <Separator className="my-2"/>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-base font-bold text-green-500">Saldo Esperado</span>
                                        <span className="text-xl font-bold text-green-500">{formatCurrency(data.cajaDiaria.saldoEsperado)}</span>
                                    </div>
                                    
                                    {(data.cajaDiaria.totalVentasNequi ?? 0) > 0 || (data.cajaDiaria.totalComprasNequi ?? 0) > 0 ? (
                                        <>
                                            <Separator className="my-2" />
                                            <div className="text-sm text-muted-foreground pt-2">Movimientos Nequi</div>
                                            <div className="flex justify-between items-baseline text-sm">
                                                <span>Ventas (Nequi)</span>
                                                <span className="font-semibold text-purple-500">+ {formatCurrency(data.cajaDiaria.totalVentasNequi ?? 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline text-sm">
                                                <span>Compras (Nequi)</span>
                                                <span className="font-semibold text-purple-500">- {formatCurrency(data.cajaDiaria.totalComprasNequi ?? 0)}</span>
                                            </div>
                                        </>
                                    ) : null}

                                </div>
                            ) : ( // Caja Cerrada
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Saldo Real</span><span className="font-semibold">{formatCurrency(data.cajaDiaria.saldoReal ?? 0)}</span></div>
                                    <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Diferencia</span><span className={`font-semibold ${data.cajaDiaria.diferencia === 0 ? '' : 'text-destructive'}`}>{formatCurrency(data.cajaDiaria.diferencia ?? 0)}</span></div>
                                    <div className="text-center pt-4">
                                        <Badge variant="secondary">CAJA CERRADA</Badge>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-4">
                                <p>La caja del día aún no ha sido abierta.</p>
                                <Button asChild>
                                    <Link href="/dashboard/contabilidad/arqueo-caja">
                                        <LogIn className="mr-2 h-4 w-4"/>
                                        Abrir Caja
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
              )}
            </>
          )}
      </div>

    </div>
  );
}
