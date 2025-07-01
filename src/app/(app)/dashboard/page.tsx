
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { List, PieChart as PieChartIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface DashboardData {
  inventoryDetails: MaterialDocument[];
  totalInventoryWeight: number;
}

export default function DashboardPage() {
  const { companyOwnerId } = useAuth();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };

  const fetchDashboardData = React.useCallback(async () => {
    if (!companyOwnerId || !db) return;

    setIsLoading(true);
    try {
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
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
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
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-lg">
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
                          formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary"/>Detalle - Top 5 Materiales</CardTitle>
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
                      {chartData.map((item) => (
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
                <CardHeader>
                  <CardTitle>Sin Datos de Inventario</CardTitle>
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

    </div>
  );
}
