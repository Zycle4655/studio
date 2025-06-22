
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import { useToast } from "@/hooks/use-toast";
import { Warehouse, FileDown, Weight, LineChart } from "lucide-react";

interface InventoryMaterial {
  name: string;
  totalWeight: number;
}

export default function ToneladasAprovechadasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inventoryData, setInventoryData] = React.useState<InventoryMaterial[]>([]);
  const [totalWeight, setTotalWeight] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchInventoryData = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const materialsRef = collection(db, "companyProfiles", user.uid, "materials");
      const q = query(materialsRef, orderBy("stock", "desc"));
      const querySnapshot = await getDocs(q);
      
      let total = 0;
      const materialsList: InventoryMaterial[] = querySnapshot.docs.map(doc => {
        const material = doc.data() as MaterialDocument;
        const stock = material.stock || 0;
        total += stock;
        return { name: material.name, totalWeight: stock };
      });
      
      setInventoryData(materialsList);
      setTotalWeight(total);

    } catch (error) {
      console.error("Error fetching inventory data for report:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del inventario." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    document.title = 'Reporte: Inventario Actual | ZYCLE';
    fetchInventoryData();
  }, [fetchInventoryData]);


  const handleExportCSV = () => {
    if (inventoryData.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay datos de inventario para exportar." });
      return;
    }

    const headers = ["Material", "Stock Actual (kg)"];
    const rows = inventoryData.map(item => [item.name, item.totalWeight.toFixed(2)]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_inventario_actual_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatWeightForDisplay = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const chartData = inventoryData.filter(d => d.totalWeight > 0).slice(0, 5);

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Warehouse className="mr-3 h-7 w-7" />
                Reporte de Inventario Actual
              </CardTitle>
              <CardDescription>
                Visualice el estado actual de su bodega. El stock se actualiza con cada compra y venta.
              </CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={isLoading || inventoryData.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                        Peso Total en Bodega
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-primary">
                        {formatWeightForDisplay(totalWeight)} kg
                    </p>
                </CardContent>
            </Card>
            {inventoryData.length > 0 && inventoryData.some(d => d.totalWeight > 0) ? (
                <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-3">
                    <CardHeader>
                    <CardTitle className="flex items-center"><LineChart className="mr-2 h-5 w-5 text-primary"/>Top 5 Materiales por Stock</CardTitle>
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
                                formatter={(value: number) => [`${formatWeightForDisplay(value)} kg`, "Stock"]}
                            />
                            <Bar dataKey="totalWeight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Stock" />
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                    <CardTitle>Detalle del Inventario</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[350px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Stock (kg)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {inventoryData.map((item) => (
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
                    <p>Aún no tienes stock en tu inventario. Registra tu inventario inicial o realiza tu primera compra.</p>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
