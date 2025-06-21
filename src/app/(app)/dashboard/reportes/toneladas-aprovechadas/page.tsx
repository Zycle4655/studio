
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, endOfDay, isWithinInterval } from "date-fns";
import type { FacturaCompraDocument, CompraMaterialItem } from "@/schemas/compra";
import { useToast } from "@/hooks/use-toast";
import { Recycle, FileDown, Weight, LineChart } from "lucide-react";

interface AggregatedMaterial {
  name: string;
  totalWeight: number;
}

type FilterPeriod = "this_week" | "this_month" | "this_year" | "all";

export default function ToneladasAprovechadasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [allPurchaseItems, setAllPurchaseItems] = React.useState<(CompraMaterialItem & { fecha: Date })[]>([]);
  const [filteredData, setFilteredData] = React.useState<AggregatedMaterial[]>([]);
  const [totalWeight, setTotalWeight] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState<FilterPeriod>("this_month");
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchPurchaseInvoices = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesRef = collection(db, "companyProfiles", user.uid, "purchaseInvoices");
      const q = query(invoicesRef, orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      
      const items: (CompraMaterialItem & { fecha: Date })[] = [];
      querySnapshot.forEach(doc => {
        const invoice = doc.data() as FacturaCompraDocument;
        const invoiceDate = invoice.fecha instanceof Timestamp ? invoice.fecha.toDate() : new Date(invoice.fecha);
        invoice.items.forEach(item => {
          items.push({ ...item, fecha: invoiceDate });
        });
      });
      setAllPurchaseItems(items);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de las compras." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    document.title = 'Reporte: Toneladas Aprovechadas | ZYCLE';
    fetchPurchaseInvoices();
  }, [fetchPurchaseInvoices]);

  React.useEffect(() => {
    const now = new Date();
    let interval: { start: Date; end: Date } | null = null;
    
    switch (activeFilter) {
      case "this_week":
        interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
        break;
      case "this_month":
        interval = { start: startOfMonth(now), end: endOfDay(now) };
        break;
      case "this_year":
        interval = { start: startOfYear(now), end: endOfDay(now) };
        break;
      case "all":
        break; 
    }

    const itemsInPeriod = interval
      ? allPurchaseItems.filter(item => isWithinInterval(item.fecha, interval!))
      : allPurchaseItems;

    const aggregation = new Map<string, number>();
    itemsInPeriod.forEach(item => {
      const currentWeight = aggregation.get(item.materialName) || 0;
      aggregation.set(item.materialName, currentWeight + item.peso);
    });

    const aggregatedArray: AggregatedMaterial[] = Array.from(aggregation, ([name, totalWeight]) => ({ name, totalWeight }))
      .sort((a, b) => b.totalWeight - a.totalWeight);
      
    const total = aggregatedArray.reduce((sum, item) => sum + item.totalWeight, 0);

    setFilteredData(aggregatedArray);
    setTotalWeight(total);
  }, [allPurchaseItems, activeFilter]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay datos para exportar en el período seleccionado." });
      return;
    }

    const headers = ["Material", "Peso Aprovechado (kg)"];
    const rows = filteredData.map(item => [item.name, item.totalWeight.toFixed(2)]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_toneladas_aprovechadas_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatWeightForDisplay = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const chartData = filteredData.slice(0, 5);

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Recycle className="mr-3 h-7 w-7" />
            Reporte de Toneladas Aprovechadas
          </CardTitle>
          <CardDescription>
            Visualice el peso total de los materiales comprados por período y exporte los datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FilterPeriod)}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="this_week">Esta Semana</TabsTrigger>
                <TabsTrigger value="this_month">Este Mes</TabsTrigger>
                <TabsTrigger value="this_year">Este Año</TabsTrigger>
                <TabsTrigger value="all">Todo</TabsTrigger>
              </TabsList>
              <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={isLoading || filteredData.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar a CSV
              </Button>
            </div>
            <TabsContent value={activeFilter} className="space-y-6">
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-3">
                   <Skeleton className="h-24 w-full md:col-span-1" />
                   <Skeleton className="h-80 w-full md:col-span-2" />
                </div>
              ) : (
                <>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center">
                            <Weight className="mr-2 h-5 w-5 text-primary"/>
                            Total Aprovechado en el Período
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-primary">
                            {formatWeightForDisplay(totalWeight)} kg
                        </p>
                    </CardContent>
                </Card>
                {filteredData.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-5">
                    <Card className="md:col-span-3">
                        <CardHeader>
                        <CardTitle className="flex items-center"><LineChart className="mr-2 h-5 w-5 text-primary"/>Top 5 Materiales por Peso</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} kg`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                    }}
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    formatter={(value: number) => [`${formatWeightForDisplay(value)} kg`, "Peso Total"]}
                                />
                                <Bar dataKey="totalWeight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardHeader>
                        <CardTitle>Detalle por Material</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[350px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right">Peso (kg)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredData.map((item) => (
                                <TableRow key={item.name}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">{formatWeightForDisplay(item.totalWeight)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No hay datos de compras en el período seleccionado.</p>
                    </div>
                )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

