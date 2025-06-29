"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import type { CajaDiariaDocument, GastoItem } from "@/schemas/caja";
import { History, ArrowLeft, ArrowRight, PlusCircle, ShoppingCart, DollarSign, Scale, Calculator, UserCheck, UserX } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";


const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = subMonths(now, i);
        const value = format(date, "yyyy-MM");
        const label = format(date, "MMMM yyyy", { locale: es });
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
};

export default function HistorialArqueoPage() {
    const { companyOwnerId, permissions } = useAuth();
    const [registros, setRegistros] = React.useState<CajaDiariaDocument[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedMonth, setSelectedMonth] = React.useState(format(new Date(), "yyyy-MM"));

    const monthOptions = React.useMemo(() => getMonthOptions(), []);

    const fetchRegistros = React.useCallback(async (month: string) => {
        if (!companyOwnerId) return;
        setIsLoading(true);

        const [year, monthIndex] = month.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, monthIndex - 1));
        const endDate = endOfMonth(startDate);

        try {
            const cajaRef = collection(db, "companyProfiles", companyOwnerId, "cajaDiaria");
            const q = query(
                cajaRef,
                where("fecha", ">=", Timestamp.fromDate(startDate)),
                where("fecha", "<=", Timestamp.fromDate(endDate)),
                orderBy("fecha", "desc")
            );

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CajaDiariaDocument));
            setRegistros(data);
        } catch (error) {
            console.error("Error fetching cash box history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [companyOwnerId]);

    React.useEffect(() => {
        document.title = 'Historial de Arqueos | ZYCLE';
        if (companyOwnerId && permissions?.contabilidad) {
            fetchRegistros(selectedMonth);
        } else {
            setIsLoading(false);
        }
    }, [companyOwnerId, permissions, selectedMonth, fetchRegistros]);

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return "$ --";
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    };

    const formatDate = (timestamp: Timestamp) => {
        return format(timestamp.toDate(), "eeee, d 'de' MMMM, yyyy", { locale: es });
    };
    
    const getExpenseTotalsByCategory = (gastos: GastoItem[] = []) => {
        return gastos.reduce((acc, gasto) => {
            acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.monto;
            return acc;
        }, {} as Record<string, number>);
    };

    if (!permissions?.contabilidad && !isLoading) {
        return (
            <div className="container py-8 px-4 md:px-6">
                <Card><CardContent className="py-12 text-center">No tiene permiso para acceder a esta sección.</CardContent></Card>
            </div>
        );
    }
    
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-headline text-primary flex items-center">
                                <History className="mr-3 h-7 w-7" />
                                Historial de Arqueos de Caja
                            </CardTitle>
                            <CardDescription>Consulte los cierres de caja de días anteriores.</CardDescription>
                        </div>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Seleccione un mes..." />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No se encontraron registros de caja para el mes seleccionado.</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {registros.map(registro => (
                                <AccordionItem value={registro.id!} key={registro.id}>
                                    <AccordionTrigger>
                                        <div className="flex flex-1 items-center justify-between pr-4">
                                            <span className="font-semibold text-base capitalize">{formatDate(registro.fecha)}</span>
                                            <div className="flex items-center gap-4">
                                                <Badge variant={registro.diferencia === 0 ? "default" : "destructive"} className={cn(registro.diferencia === 0 && "bg-green-600 hover:bg-green-700")}>
                                                    Diferencia: {formatCurrency(registro.diferencia)}
                                                </Badge>
                                                <Badge variant={registro.estado === 'Cerrada' ? 'secondary' : 'default'}>{registro.estado}</Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-muted/50 rounded-md">
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                <InfoCard title="Base Inicial" value={formatCurrency(registro.baseInicial)} icon={<DollarSign />}/>
                                                <InfoCard title="Ventas (Efectivo)" value={formatCurrency(registro.totalVentasEfectivo)} icon={<ArrowLeft className="text-green-500"/>}/>
                                                <InfoCard title="Compras (Efectivo)" value={formatCurrency(registro.totalComprasEfectivo)} icon={<ArrowRight className="text-red-500" />}/>
                                                <InfoCard title="Ingresos Adicionales" value={formatCurrency(registro.totalIngresosAdicionales)} icon={<PlusCircle className="text-blue-500"/>}/>
                                                <InfoCard title="Total Gastos" value={formatCurrency(registro.totalGastos)} icon={<ShoppingCart className="text-orange-500"/>}/>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                                <InfoCard title="Saldo Esperado" value={formatCurrency(registro.saldoEsperado)} icon={<Scale />} isLarge />
                                                <InfoCard title="Saldo Real Reportado" value={formatCurrency(registro.saldoReal)} icon={<DollarSign />} isLarge />
                                                <InfoCard title="Diferencia" value={formatCurrency(registro.diferencia)} status={registro.diferencia === 0 ? 'ok' : 'warn'} icon={<Calculator />} isLarge />
                                            </div>
                                            
                                             {registro.gastos && registro.gastos.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-2 text-primary">Detalle de Gastos:</h4>
                                                    <div className="border rounded-md p-2 text-sm max-h-48 overflow-y-auto bg-background">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead>Vehículo</TableHead><TableHead>Observación</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                            {registro.gastos.map(gasto => (
                                                                <TableRow key={gasto.id}>
                                                                    <TableCell className="capitalize font-medium">{gasto.categoria}</TableCell>
                                                                    <TableCell>{gasto.vehiculoPlaca || 'N/A'}</TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">{gasto.observacion || 'Sin observación'}</TableCell>
                                                                    <TableCell className="text-right font-semibold">{formatCurrency(gasto.monto)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            )}

                                            {registro.observaciones && (
                                                <div className="p-4 bg-background rounded-md border">
                                                    <h4 className="font-semibold text-sm mb-1 text-primary">Observaciones del Cierre:</h4>
                                                    <p className="text-sm text-muted-foreground">{registro.observaciones}</p>
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                                                <span className="flex items-center gap-1"><UserCheck size={14} />Abierto por: {registro.abiertoPor.email}</span>
                                                <span className="flex items-center gap-1"><UserX size={14} />Cerrado por: {registro.cerradoPor?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


function InfoCard({ title, value, icon, status, isLarge = false }: { title: string, value: string, icon: React.ReactNode, status?: 'ok' | 'warn', isLarge?: boolean }) {
    return (
        <Card className={cn("bg-background", isLarge && "py-4")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", isLarge && "text-base")}>{title}</CardTitle>
                <span className="text-muted-foreground">{icon}</span>
            </CardHeader>
            <CardContent>
                <div className={cn("font-bold", isLarge ? "text-3xl" : "text-2xl", status === 'warn' && 'text-destructive', status === 'ok' && 'text-green-600')}>{value}</div>
            </CardContent>
        </Card>
    )
}
