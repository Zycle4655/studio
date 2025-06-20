
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

const DEFAULT_MATERIALS = [
  { name: "ARCHIVO", price: 600, code: "201" },
  { name: "REVISTA", price: 450, code: "207" },
  { name: "PERIODICO", price: 450, code: "204" },
  { name: "TETRA PAK", price: 200, code: "206" },
  { name: "CARTON", price: 500, code: "202" },
  { name: "CUBETA HUEVO", price: 100, code: "205" },
  { name: "PLEGADIZA", price: 100, code: "205" },
  { name: "VIDRIO CASCO", price: 100, code: "499" },
  { name: "VIDRIO PLANO", price: 100, code: "499" },
  { name: "POLICOLOR", price: 300, code: "306" },
  { name: "PLAST TRANS", price: 800, code: "306" },
  { name: "PET REVUELTO", price: 950, code: "303" },
  { name: "PET VERDE", price: 700, code: "303" },
  { name: "PET AMBAR", price: 600, code: "303" },
  { name: "PET ACEITE", price: 300, code: "303" },
  { name: "PET TRANS", price: 1700, code: "303" },
  { name: "CLAUSEN", price: 6900, code: "101" },
  { name: "GALONES", price: 1000, code: "307" },
  { name: "PVC BLANDO", price: 400, code: "304" },
  { name: "PVC TUBO", price: 500, code: "304" },
  { name: "PVCTECHO", price: 300, code: "304" },
  { name: "CUÑETE", price: 1000, code: "302" },
  { name: "CANASTA", price: 1300, code: "302" },
  { name: "PASTA", price: 900, code: "302" },
  { name: "TATUCO", price: 1300, code: "307" },
  { name: "CHATARRA", price: 720, code: "102" },
  { name: "ACERO", price: 3300, code: "106" },
  { name: "TAPA", price: 900, code: "302" },
  { name: "ALUM GRUESO", price: 5500, code: "101" },
  { name: "POTE AEROSOL", price: 5400, code: "101" },
  { name: "ALUMI LAMINA", price: 6000, code: "101" },
  { name: "ALUM PERFIL", price: 7500, code: "101" },
  { name: "ANTIMONIO", price: 5500, code: "105" },
  { name: "ALUMINIO OLLA", price: 6200, code: "101" },
  { name: "BRONCE", price: 20000, code: "104" },
  { name: "COBRE #2", price: 30000, code: "103" },
  { name: "COBRE #1", price: 30000, code: "103" },
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
  
  const initializationRan = React.useRef(false);


  const getMaterialsCollectionRef = React.useCallback(() => {
    // Apunta a la colección global de materiales
    if (!db) return null;
    return collection(db, "globalMaterials");
  }, []);

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
  }, [getMaterialsCollectionRef]);


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

      if (querySnapshot.empty && !initializationRan.current) {
        initializationRan.current = true; // Mark initialization as attempted for this session
        const success = await initializeDefaultMaterials();
        if (success) {
          // Re-fetch materials after successful initialization
          querySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
        }
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
  }, [getMaterialsCollectionRef, initializeDefaultMaterials, user]);


  React.useEffect(() => {
    document.title = 'Gestión de Materiales Global | ZYCLE';
    if (user) {
      fetchMaterials();
    } else {
      setIsLoading(false);
      setMaterials([]);
      initializationRan.current = false; // Reset on logout
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
                <p className="text-muted-foreground mb-6">Si es la primera vez, la lista de materiales por defecto debería cargarse. Si no, añada un nuevo material utilizando el botón flotante. <br/> Si borró la colección 'globalMaterials' de Firestore, recargue esta página para que se inicialice.</p>
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
    
