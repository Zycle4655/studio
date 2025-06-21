
"use client";

import * as React from "react";
import { Warehouse, PackageSearch, Package, Code } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";

export default function InventarioPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "materials");
  }, [user]);

  const fetchMaterials = React.useCallback(async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef) {
      if (user) {
        toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(materialsCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const materialsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
      );
      setMaterials(materialsList);
    } catch (error) {
      console.error("Error fetching materials for inventory:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Inventario",
        description: "No se pudo cargar el inventario de materiales.",
      });
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [getMaterialsCollectionRef, user, toast]);

  React.useEffect(() => {
    document.title = 'Inventario de Materiales | ZYCLE';
    if (user) {
      fetchMaterials();
    } else {
      setIsLoading(false);
      setMaterials([]);
    }
  }, [user, fetchMaterials]);
  
  const formatStock = (stock: number | undefined) => {
    const value = stock || 0;
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };
  
  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Inventario de Materiales</CardTitle>
                    <CardDescription>Por favor, inicie sesión para ver el inventario.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Debe iniciar sesión para ver esta página.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Warehouse className="mr-3 h-7 w-7" />
                Inventario de Materiales
              </CardTitle>
              <CardDescription>
                Consulte el stock actual de todos sus materiales registrados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay materiales en el inventario</h3>
              <p className="text-muted-foreground">Cuando registre materiales y realice compras, su stock aparecerá aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Package size={16} className="text-muted-foreground" />
                        {material.name}
                      </TableCell>
                      <TableCell>
                        {material.code ? (
                          <Badge variant="secondary" className="font-mono">
                            <Code className="mr-1.5 h-3.5 w-3.5" />
                            {material.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatStock(material.stock)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
