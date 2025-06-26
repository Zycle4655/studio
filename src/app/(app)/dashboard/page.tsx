
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import type { FacturaCompraDocument } from "@/schemas/compra";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface DashboardData {
  inventoryDetails: MaterialDocument[];
  totalInventoryWeight: number;
}

export default function DashboardPage() {
  const { user, companyOwnerId } = useAuth();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };

  const fetchDashboardData = React.useCallback(async () => {
    if (!companyOwnerId || !db) return;

    setIsLoading(true);
    try {
      // Fetch Materials for inventory calculations
      const materialsRef = collection(db, "companyProfiles", companyOwnerId, "materials");
      const materialsSnapshot = await getDocs(query(materialsRef, orderBy("stock", "desc")));
      const materialsList = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialDocument));
      const totalInventoryWeight = materialsList.reduce((sum, mat) => sum + (mat.stock || 0), 0);
      
      setData({
        inventoryDetails: materialsList,
        totalInventoryWeight: totalInventoryWeight,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Handle error gracefully, maybe show a toast or a message
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId]);

  React.useEffect(() => {
    document.title = 'Dashboard | ZYCLE';
    if (companyOwnerId) {
      fetchDashboardData();
    }
  }, [companyOwnerId, fetchDashboardData]);

  const chartData = data?.inventoryDetails.filter(d => (d.stock || 0) > 0).slice(0, 5) || [];


  if (isLoading) {
    return (
       <div className="container py-8 px-4 md:px-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-3/5 mb-3" />
          <Skeleton className="h-6 w-4/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-5">
            <Skeleton className="h-96 md:col-span-3" />
            <Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    )
  }


  return (
    <div className="container py-8 px-4 md:px-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">Dashboard</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Un resumen en tiempo real de la operación de su empresa.
        </p>
      </div>

       <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary font-headline mb-4">Análisis de Inventario Actual</h2>
         {data && data.inventoryDetails.length > 0 && data.totalInventoryWeight > 0 ? (
            <div className="grid gap-6 md:grid-cols-5">
              <Card className="md:col-span-3 shadow-lg">
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
                        formatter={(value: number) => [`${formatWeight(value)}`, "Stock"]}
                      />
                      <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Stock" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="md:col-span-2 shadow-lg">
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
                      {data.inventoryDetails.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right font-semibold">{formatWeight(item.stock || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-lg text-center py-12">
                <CardContent>
                    <p className="text-muted-foreground">No hay stock en el inventario para mostrar análisis.</p>
                    <p className="text-sm text-muted-foreground mt-2">Registre su inventario inicial o su primera compra para ver los gráficos.</p>
                </CardContent>
            </Card>
          )}
      </div>

    </div>
  );
}
