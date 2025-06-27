
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { AsociadoDocument } from "@/schemas/sui";
import { Weight, Calendar as CalendarIcon, FileDown, Search, ArrowLeft } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { saveAs } from "file-saver";

interface ReportRow {
  semana: number;
  tipoId: string;
  numeroId: string;
  placaVehiculo: string;
  codigoMaterial: string;
  cantidadEntrante: number; // en Toneladas
}

// Helper para obtener el número de la semana del mes (1-5)
const getWeekOfMonth = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const adjustedDate = date.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  return Math.ceil(adjustedDate / 7);
};


export default function BalanceMasasPage() {
  const { companyOwnerId } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportData, setReportData] = React.useState<ReportRow[]>([]);
  const [isReportGenerated, setIsReportGenerated] = React.useState(false);

  React.useEffect(() => {
    document.title = 'SUI: Balance de Masas | ZYCLE';
  }, []);

  const handleGenerateReport = async () => {
    if (!companyOwnerId) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar la empresa." });
      return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ variant: "destructive", title: "Fechas requeridas", description: "Por favor, seleccione un rango de fechas." });
      return;
    }

    setIsLoading(true);
    setIsReportGenerated(false);
    setReportData([]);

    try {
      const startDate = Timestamp.fromDate(startOfDay(dateRange.from));
      const endDate = Timestamp.fromDate(endOfDay(dateRange.to));

      // 1. Obtener todos los asociados y ponerlos en un mapa para búsqueda rápida
      const asociadosRef = collection(db, "companyProfiles", companyOwnerId, "asociados");
      const asociadosSnap = await getDocs(asociadosRef);
      const asociadosMap = new Map<string, AsociadoDocument>();
      asociadosSnap.forEach(doc => {
        asociadosMap.set(doc.id, { id: doc.id, ...doc.data() } as AsociadoDocument);
      });

      // 2. Obtener las facturas de compra de asociados en el rango de fechas
      const invoicesRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
      const q = query(
        invoicesRef,
        where("tipoProveedor", "==", "asociado"),
        where("fecha", ">=", startDate),
        where("fecha", "<=", endDate)
      );
      const invoicesSnap = await getDocs(q);
      const invoices = invoicesSnap.docs.map(doc => doc.data() as FacturaCompraDocument);

      if (invoices.length === 0) {
        toast({ title: "Sin Datos", description: "No se encontraron facturas de compra a asociados en el período seleccionado." });
        setIsReportGenerated(true);
        setIsLoading(false);
        return;
      }
      
      // 3. Procesar y agregar los datos
      const aggregatedData = new Map<string, ReportRow>();

      for (const invoice of invoices) {
        if (!invoice.proveedorId) continue;
        
        const asociado = asociadosMap.get(invoice.proveedorId);
        if (!asociado) continue;

        const invoiceDate = invoice.fecha.toDate();
        const semana = getWeekOfMonth(invoiceDate);

        for (const item of invoice.items) {
           if (!item.materialCode) continue;

           const key = `${semana}-${asociado.id}-${item.materialCode}`;
           const pesoEnToneladas = item.peso / 1000;

           if (aggregatedData.has(key)) {
             const existingRow = aggregatedData.get(key)!;
             existingRow.cantidadEntrante += pesoEnToneladas;
           } else {
             aggregatedData.set(key, {
               semana,
               tipoId: asociado.tipoIdentificacion,
               numeroId: asociado.numeroIdentificacion,
               placaVehiculo: asociado.placaVehiculo || "N/A",
               codigoMaterial: item.materialCode,
               cantidadEntrante: pesoEnToneladas,
             });
           }
        }
      }

      setReportData(Array.from(aggregatedData.values()));
      setIsReportGenerated(true);

    } catch (error) {
      console.error("Error generating mass balance report:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte." });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay datos para exportar." });
      return;
    }

    const headers = [
      "numero de la semana",
      "tipo de identificacion",
      "numero de identificacion",
      "placa del vehiculo que ingresa el material",
      "cantidad de material entrante",
      "tipo de material entrante",
    ];

    const csvRows = [
      headers.join(","),
      ...reportData.map(row => 
        [
          row.semana,
          row.tipoId,
          `"${row.numeroId}"`, // Encerrar en comillas por si tiene caracteres especiales
          row.placaVehiculo,
          row.cantidadEntrante.toFixed(6), // Toneladas con 6 decimales
          row.codigoMaterial
        ].join(",")
      )
    ];

    const csvString = csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const fileName = `balance_masas_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_a_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.csv`;
    saveAs(blob, fileName);
  };
  

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Weight className="mr-3 h-7 w-7" />
            Balance de Masas
          </CardTitle>
          <CardDescription>
            Genere y exporte el reporte de balance de masas seleccionando un rango de fechas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-10 w-64" />
             </div>
          ) : !isReportGenerated ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-[300px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                            {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                        )
                        ) : (
                        <span>Seleccione un rango de fechas</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                    />
                    </PopoverContent>
                </Popover>
                <Button onClick={handleGenerateReport} disabled={!dateRange?.from || !dateRange?.to}>
                    <Search className="mr-2 h-4 w-4" /> Generar Reporte
                </Button>
            </div>
          ) : (
             <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Button onClick={() => setIsReportGenerated(false)} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                    <Button onClick={downloadCSV} disabled={reportData.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" /> Descargar CSV
                    </Button>
                </div>

                 {reportData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Semana</TableHead>
                                    <TableHead>Tipo ID</TableHead>
                                    <TableHead>N° ID</TableHead>
                                    <TableHead>Placa</TableHead>
                                    <TableHead>Cód. Material</TableHead>
                                    <TableHead className="text-right">Toneladas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{row.semana}</TableCell>
                                        <TableCell>{row.tipoId}</TableCell>
                                        <TableCell>{row.numeroId}</TableCell>
                                        <TableCell>{row.placaVehiculo}</TableCell>
                                        <TableCell>{row.codigoMaterial}</TableCell>
                                        <TableCell className="text-right">{row.cantidadEntrante.toFixed(6)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                 ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No se encontraron datos de compras a asociados para generar el reporte en el período seleccionado.</p>
                    </div>
                 )}
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    