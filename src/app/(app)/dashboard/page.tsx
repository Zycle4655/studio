
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, Coins, Package, ReceiptText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import type { FacturaCompraDocument } from "@/schemas/compra";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardData {
  totalInventoryValue: number;
  totalInventoryWeight: number;
  materialTypesCount: number;
  lastPurchaseTotal: number | null;
  lastPurchaseDate: string | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };

  const formatDate = (timestamp: Timestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "d 'de' LLLL, yyyy", { locale: es }); 
  };


  const fetchDashboardData = React.useCallback(async () => {
    if (!user || !db) return;

    setIsLoading(true);
    try {
      // Fetch Materials for inventory calculations
      const materialsRef = collection(db, "companyProfiles", user.uid, "materials");
      const materialsSnapshot = await getDocs(materialsRef);
      const materialsList = materialsSnapshot.docs.map(doc => doc.data() as MaterialDocument);

      const totalInventoryValue = materialsList.reduce((sum, mat) => sum + (mat.stock || 0) * mat.price, 0);
      const totalInventoryWeight = materialsList.reduce((sum, mat) => sum + (mat.stock || 0), 0);
      const materialTypesCount = materialsList.length;

      // Fetch last purchase invoice
      const invoicesRef = collection(db, "companyProfiles", user.uid, "purchaseInvoices");
      const q = query(invoicesRef, orderBy("fecha", "desc"), limit(1));
      const invoicesSnapshot = await getDocs(q);
      
      let lastPurchaseTotal: number | null = null;
      let lastPurchaseDate: string | null = null;

      if (!invoicesSnapshot.empty) {
        const lastInvoice = invoicesSnapshot.docs[0].data() as FacturaCompraDocument;
        lastPurchaseTotal = lastInvoice.totalFactura;
        lastPurchaseDate = formatDate(lastInvoice.fecha);
      }

      setData({
        totalInventoryValue,
        totalInventoryWeight,
        materialTypesCount,
        lastPurchaseTotal,
        lastPurchaseDate,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Handle error gracefully, maybe show a toast or a message
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    document.title = 'Dashboard | ZYCLE';
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const metrics = [
    {
      title: "Valor del Inventario",
      value: data ? formatCurrency(data.totalInventoryValue) : "...",
      icon: <Coins className="h-8 w-8 text-primary" />,
      description: "Valor total de los materiales en stock.",
    },
    {
      title: "Peso Total en Bodega",
      value: data ? formatWeight(data.totalInventoryWeight) : "...",
      icon: <Warehouse className="h-8 w-8 text-primary" />,
      description: "Suma del peso de todo el material.",
    },
    {
      title: "Tipos de Materiales",
      value: data ? data.materialTypesCount : "...",
      icon: <Package className="h-8 w-8 text-primary" />,
      description: "Cantidad de materiales diferentes registrados.",
    },
    {
      title: "Última Compra",
      value: data?.lastPurchaseTotal ? formatCurrency(data.lastPurchaseTotal) : "N/A",
      icon: <ReceiptText className="h-8 w-8 text-primary" />,
      description: data?.lastPurchaseDate ? `Registrada el ${data.lastPurchaseDate}` : "Aún no hay compras registradas.",
    },
  ];

  if (isLoading) {
    return (
       <div className="container py-8 px-4 md:px-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-3/5 mb-3" />
          <Skeleton className="h-6 w-4/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
             <Card key={i} className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                   <Skeleton className="h-7 w-2/3" />
                   <Skeleton className="h-8 w-8" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-1/2 mb-2" />
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>
          ))}
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-semibold font-headline">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between">
              <div>
                <p className="text-3xl font-bold text-primary mb-1">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
