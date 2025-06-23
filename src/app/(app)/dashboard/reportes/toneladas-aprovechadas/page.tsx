
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { FacturaCompraDocument, CompraMaterialItem } from "@/schemas/compra";
import { useToast } from "@/hooks/use-toast";
import { Recycle, FileDown, Weight } from "lucide-react";
import { startOfWeek, startOfMonth, startOfYear, endOfDay, sub } from "date-fns";

interface ReportMaterial {
  name: string;
  totalWeight: number;
}

type Period = "week" | "month" | "year" | "all";

export default function ToneladasAprovechadasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reportData, setReportData] = React.useState<ReportMaterial[]>([]);
  const [totalWeight, setTotalWeight] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>("month");

  const fetchPurchaseReportData = React.useCallback(async (period: Period) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const purchaseInvoicesRef = collection(db, "companyProfiles", user.uid, "purchaseInvoices");
      
      const now = new Date();
      let startDate: Date;
      const endDate = endOfDay(now);

      switch (period) {
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          break;
        case "all":
        default:
          startDate = new Date("2000-01-01"); // Una fecha muy antigua para traer todo
          break;
      }

      const q = query(
        purchaseInvoicesRef, 
        where("fecha", ">=", Timestamp.fromDate(startDate)),
        where("fecha", "<=", Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      const invoices = querySnapshot.docs.map(doc => doc.data() as FacturaCompraDocument);

      const materialTotals = new Map<string, ReportMaterial>();

      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          const existing = materialTotals.get(item.materialId);
          if (existing) {
            existing.totalWeight += item.peso;
          } else {
            materialTotals.set(item.materialId, {
              name: item.materialName,
              totalWeight: item.peso,
            });
          }
        });
      });

      const aggregatedData = Array.from(materialTotals.values()).sort((a, b) => b.totalWeight - a.totalWeight);
      const total = aggregatedData.reduce((sum, item) => sum + item.totalWeight, 0);

      setReportData(aggregatedData);
      setTotalWeight(total);

    } catch (error) {
      console.error("Error fetching purchase report data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de las compras." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    document.title = 'Reporte: Toneladas Aprovechadas | ZYCLE';
    fetchPurchaseReportData(selectedPeriod);
  }, [fetchPurchaseReportData, selectedPeriod]);


  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay datos para exportar en este período." });
      return;
    }

    const headers = ["Material", "Peso Aprovechado (kg)"];
    const rows = reportData.map(item => [item.name, item.totalWeight.toFixed(2)]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_toneladas-aprovechadas_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatWeightForDisplay = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Recycle className="mr-3 h-7 w-7" />
                Reporte de Toneladas Aprovechadas
              </CardTitle>
              <CardDescription>
                Analice el total de material aprovechado (comprado) por período. Los datos se basan en las facturas de compra.
              </CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={isLoading || reportData.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as Period)}>
            <TabsList>
              <TabsTrigger value="week">Esta Semana</TabsTrigger>
              <TabsTrigger value="month">Este Mes</TabsTrigger>
              <TabsTrigger value="year">Este Año</TabsTrigger>
              <TabsTrigger value="all">Historial Completo</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
             <div className="space-y-6">
               <Skeleton className="h-24 w-full" />
               <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                        <Weight className="mr-2 h-5 w-5 text-primary"/>
                        Peso Total Aprovechado en el Período
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-primary">
                        {formatWeightForDisplay(totalWeight)} kg
                    </p>
                </CardContent>
            </Card>
            {reportData.length > 0 ? (
                <Card className="mt-6">
                    <CardHeader>
                    <CardTitle>Detalle de Materiales Aprovechados</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Peso (kg)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {reportData.map((item) => (
                            <TableRow key={item.name}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{formatWeightForDisplay(item.totalWeight)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No se encontraron materiales aprovechados (compras) en el período seleccionado.</p>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
