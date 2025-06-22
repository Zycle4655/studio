
"use client";

import * as React from "react";
import { Warehouse, PackageSearch, Package, Code, Save } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, writeBatch, doc } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


// Esquema dinámico para el formulario de inventario inicial
const createInitialInventorySchema = (materials: MaterialDocument[]) => {
  const shape: { [key: string]: z.ZodTypeAny } = {};
  materials.forEach(material => {
    shape[material.id] = z.coerce
      .number()
      .min(0, "El valor no puede ser negativo")
      .optional();
  });
  return z.object(shape);
};


export default function InventarioPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showInitialInventoryForm, setShowInitialInventoryForm] = React.useState(false);
  const [isSubmittingInitialStock, setIsSubmittingInitialStock] = React.useState(false);

  const form = useForm({
    // El resolver se establecerá dinámicamente
  });


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

      const totalStock = materialsList.reduce((sum, material) => sum + (material.stock || 0), 0);
      if (materialsList.length > 0 && totalStock === 0) {
        setShowInitialInventoryForm(true);
        // Configurar el resolver del formulario dinámicamente
        form.reset({}, { keepValues: false }); // Limpiar el formulario
        (form as any).resolver = zodResolver(createInitialInventorySchema(materialsList));
      } else {
        setShowInitialInventoryForm(false);
      }

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
  }, [getMaterialsCollectionRef, user, toast, form]);

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
  
  const handleInitialInventorySubmit = async (data: Record<string, any>) => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef || !db || !user) {
        toast({ variant: "destructive", title: "Error", description: "No se puede guardar el inventario, la conexión falló." });
        return;
    }
    setIsSubmittingInitialStock(true);
    try {
        const batch = writeBatch(db);

        materials.forEach(material => {
            const stockValue = parseFloat(data[material.id]);
            if (!isNaN(stockValue) && stockValue > 0) {
                // Update stock in material document
                const materialRef = doc(materialsCollectionRef, material.id);
                batch.update(materialRef, { stock: stockValue });
            }
        });
        
        await batch.commit();
        toast({ title: "Inventario Actualizado", description: "Se ha actualizado tu stock." });
        setShowInitialInventoryForm(false);
        fetchMaterials(); // Recargar los materiales para mostrar el nuevo stock
    } catch (error) {
        console.error("Error saving initial inventory:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el inventario inicial." });
    } finally {
        setIsSubmittingInitialStock(false);
    }
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
      
      {showInitialInventoryForm && (
        <Card className="shadow-xl mb-8 bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="text-xl font-headline text-primary">Configurar Inventario Inicial</CardTitle>
                <CardDescription>
                    Parece que es tu primera vez aquí o no tienes stock. Ingresa las cantidades iniciales (en kg) de los materiales que ya tienes en tu bodega.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleInitialInventorySubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {materials.map(material => (
                                <FormField
                                    key={material.id}
                                    control={form.control}
                                    name={material.id}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">{material.name}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    placeholder="0.00 kg" 
                                                    step="0.01"
                                                    {...field}
                                                    value={String(field.value ?? "")}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "") {
                                                            field.onChange(undefined);
                                                        } else {
                                                            const num = parseFloat(val);
                                                            field.onChange(isNaN(num) ? undefined : num);
                                                        }
                                                    }}
                                                    disabled={isSubmittingInitialStock}
                                                    className="bg-background"
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmittingInitialStock}>
                                {isSubmittingInitialStock ? "Guardando..." : <><Save className="mr-2 h-4 w-4"/> Guardar Inventario Inicial</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
      )}

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
