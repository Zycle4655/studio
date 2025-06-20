
"use client";

import type { Metadata } from 'next';
import * as React from "react";
import { Plus, Edit, Trash2, PackageOpen, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { db, auth } from "@/lib/firebase"; // Import auth
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import MaterialForm from "@/components/forms/MaterialForm";
import type { MaterialFormData, MaterialDocument } from "@/schemas/material";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';

// Lista de materiales estándar por defecto actualizada con códigos
const DEFAULT_MATERIALS = [
  { name: "COBRE N1", price: 30000 },
  { name: "COBRE N2", price: 30000 },
  { name: "BRONCE", price: 20000 },
  { name: "ACERO", price: 3300 },
  { name: "ALUMINIO GRUESO", price: 5500, code: "101" },
  { name: "ALUMINIO GUAYA", price: 8000 },
  { name: "ALUMINIO PERFIL", price: 7500, code: "101" },
  { name: "ALUMINIO OLLA", price: 6200, code: "101" },
  { name: "ALUMINIO LAMINA", price: 6000, code: "101" },
  { name: "CLAUSEN POTE", price: 6900, code: "101" },
  { name: "POTE AEROSOL", price: 5400, code: "101" },
  { name: "VIRUTA DE ACERO", price: 2500 },
  { name: "VIRUTA BRONCE", price: 10000 },
  { name: "RINES DE AUTOMOVIL", price: 6000 },
  { name: "RINES DE BICICLETA", price: 6000 },
  { name: "RINES DE CAMION", price: 6000 },
  { name: "ANTIMONIO", price: 5500 },
  { name: "RADIADOR COBRE", price: 20100 },
  { name: "RADIADOR ALUMINIO", price: 4500 },
  { name: "RADIADOR MIXTO", price: 16000 },
  { name: "DESARME O INDUCIDO", price: 1200 },
  { name: "CABLE DE PELAR", price: 9000 },
  { name: "CABLE DE QUEMAR", price: 4000 },
  { name: "PLANCHA", price: 2300 },
  { name: "TARRO SALCHICHA ALUMINIO", price: 4500 },
  { name: "CARTON", price: 500 },
  { name: "ARCHIVO", price: 600 },
  { name: "PERIODICO", price: 450 },
  { name: "REVISTA", price: 450 },
  { name: "PLEGADIZA", price: 100 },
  { name: "PET TRANSPARENTE", price: 1700 },
  { name: "PET VERDE", price: 700 },
  { name: "PET ACEITE", price: 300 },
  { name: "PET AMBAR", price: 600 },
  { name: "PET REVUELTO", price: 950 },
  { name: "POLICOLOR", price: 300 },
  { name: "PLASTICO TRANSPARENTE", price: 800 },
  { name: "POLIESTILENO", price: 500 },
  { name: "VASIJA BLANCA", price: 900 },
  { name: "VASIJA NEGRA", price: 600 },
  { name: "CUÑETE", price: 1000, code: "302" },
  { name: "CANASTA GRANDE", price: 2500 },
  { name: "CANASTA", price: 1300, code: "302" },
  { name: "ACRILICO", price: 2000 },
  { name: "TATUCO/SOPLADO", price: 1300 },
  { name: "TAPAS", price: 900, code: "302" },
  { name: "SELECCIÓN", price: 300 },
  { name: "PASTA", price: 900, code: "302" },
  { name: "PVC TUBO", price: 500 },
  { name: "PVC TECHO", price: 300 },
  { name: "CUBETA HUEVO", price: 100 },
  { name: "VIDRIO", price: 100 },
  { name: "TETRA PAK", price: 200 },
  { name: "GALONES", price: 1000 },
  { name: "CHATARRA", price: 720 },
  { name: "TAPA", price: 900, code: "302" },
  { name: "BATERIA", price: 2300 },
];


export default function MaterialesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<MaterialDocument | null>(null);

  const [materialToDelete, setMaterialToDelete] = React.useState<MaterialDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);


  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!db) return null;
    return collection(db, "globalMaterials");
  }, [db]);

  const initializeDefaultMaterials = React.useCallback(async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef || !db) return false;

    setIsSubmitting(true); // Indicate that an operation is in progress
    try {
      const batch = writeBatch(db);
      DEFAULT_MATERIALS.forEach(material => {
        const newMaterialRef = doc(materialsCollectionRef);
        batch.set(newMaterialRef, {
          ...material,
          price: parseFloat(Number(material.price).toFixed(2)),
          code: material.code || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      // No toast for successful silent initialization
      return true;
    } catch (error) {
      console.error("Error initializing default global materials:", error);
      toast({
        variant: "destructive",
        title: "Error al Inicializar Materiales Globales",
        description: "No se pudo crear la lista de materiales estándar globales.",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [getMaterialsCollectionRef, toast, db]);


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
      let querySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));

      if (querySnapshot.empty) {
        // Only attempt to initialize if the collection is genuinely empty
        const success = await initializeDefaultMaterials();
        if (success) {
          // Re-fetch materials after successful initialization
          querySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
        }
        // If initialization failed, querySnapshot will still be empty, and an empty list will be shown.
        // The error toast is handled within initializeDefaultMaterials.
      }

      const materialsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
      );
      setMaterials(materialsList);

    } catch (error) {
      console.error("Error fetching global materials:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Materiales Globales",
        description: "No se pudieron cargar los materiales globales.",
      });
      setMaterials([]); // Ensure materials is empty on error
    } finally {
      setIsLoading(false);
    }
  }, [getMaterialsCollectionRef, toast, initializeDefaultMaterials, user]); // user is for the toast when db connection is not ready


  React.useEffect(() => {
    document.title = 'Gestión de Materiales Global | ZYCLE';
    if (user) {
      fetchMaterials();
    } else {
      setIsLoading(false);
      setMaterials([]);
    }
  }, [user, fetchMaterials]);


  const handleAddMaterial = () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar materiales." });
        return;
    }
    setEditingMaterial(null);
    setIsFormOpen(true);
  };

  const handleEditMaterial = (material: MaterialDocument) => {
     if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para editar materiales." });
        return;
    }
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (material: MaterialDocument) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para eliminar materiales." });
        return;
    }
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMaterial = async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialToDelete || !materialsCollectionRef) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el material global." });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(materialsCollectionRef, materialToDelete.id));
      toast({
        title: "Material Global Eliminado",
        description: `El material "${materialToDelete.name}" ha sido eliminado de la lista global.`,
      });
      fetchMaterials();
    } catch (error) {
      console.error("Error deleting global material:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el material global.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  const handleFormSubmit = async (data: MaterialFormData) => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef) {
      toast({ variant: "destructive", title: "Error", description: "La base de datos no está disponible." });
      return;
    }
    setIsSubmitting(true);
    const materialData = {
      ...data,
      price: parseFloat(Number(data.price).toFixed(2)),
      code: data.code || null,
    };

    try {
      if (editingMaterial) {
        const materialRef = doc(materialsCollectionRef, editingMaterial.id);
        await updateDoc(materialRef, {
          ...materialData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Material Global Actualizado",
          description: `El material "${data.name}" ha sido actualizado en la lista global.`,
        });
      } else {
        await addDoc(materialsCollectionRef, {
          ...materialData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Material Global Agregado",
          description: `El material "${data.name}" ha sido agregado a la lista global.`,
        });
      }
      setIsFormOpen(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error) {
      console.error("Error saving global material:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar el material global.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  };

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestión de Materiales Globales</CardTitle>
                    <CardDescription>Por favor, inicie sesión para administrar los materiales.</CardDescription>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-primary">
              Gestión de Materiales Globales
            </CardTitle>
            <CardDescription>
              Añada, edite o elimine los tipos de materiales, sus precios y códigos para toda la aplicación.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : materials.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay materiales globales registrados</h3>
                <p className="text-muted-foreground mb-6">Si es la primera vez, la lista de materiales por defecto debería cargarse. Si no, añada un nuevo material utilizando el botón flotante.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Precio (COP)</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                        {material.code ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                <Code className="mr-1.5 h-3.5 w-3.5" />
                                {material.code}
                            </span>
                        ) : (
                            <span className="text-muted-foreground italic text-xs">N/A</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(material.price)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                        onClick={() => handleEditMaterial(material)}
                        aria-label="Editar material"
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive"
                        onClick={() => openDeleteDialog(material)}
                        aria-label="Eliminar material"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
        size="icon"
        onClick={handleAddMaterial}
        aria-label="Agregar nuevo material global"
        disabled={!user || isLoading || isSubmitting}
      >
        <Plus className="h-8 w-8" />
      </Button>

      <MaterialForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingMaterial || {}}
        isLoading={isSubmitting}
        title={editingMaterial ? "Editar Material Global" : "Agregar Nuevo Material Global"}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este material global?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El material "{materialToDelete?.name}" será eliminado permanentemente de la lista global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaterialToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMaterial}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    