
"use client";

import type { Metadata } from 'next';
import * as React from "react";
import { Plus, Edit, Trash2, PackageOpen } from "lucide-react";
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

// Lista de materiales estándar por defecto
const DEFAULT_MATERIALS = [
  { name: "Plástico PET (Botellas)", price: 1200 },
  { name: "Cartón y Papel", price: 350 },
  { name: "Vidrio", price: 200 },
  { name: "Chatarra Ferrosa", price: 600 },
  { name: "Aluminio (Latas)", price: 3500 },
  { name: "Cobre", price: 15000 },
  { name: "Bronce", price: 10000 },
  { name: "Archivo (Papel Blanco)", price: 500 },
  { name: "Plástico Soplado (HDPE)", price: 800 },
  { name: "Pasta (Residuos Plásticos Mezclados)", price: 150 },
];


export default function MaterialesPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // Obtener el usuario autenticado
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<MaterialDocument | null>(null);

  const [materialToDelete, setMaterialToDelete] = React.useState<MaterialDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [hasInitializedMaterials, setHasInitializedMaterials] = React.useState(false);

  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "materials");
  }, [user]);

  const initializeDefaultMaterials = React.useCallback(async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef || !db || !user ) return false;

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_MATERIALS.forEach(material => {
        const newMaterialRef = doc(materialsCollectionRef); // Firestore genera el ID
        batch.set(newMaterialRef, {
          ...material,
          price: parseFloat(Number(material.price).toFixed(2)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({
        title: "Materiales Inicializados",
        description: "Se ha creado tu lista de materiales estándar.",
      });
      setHasInitializedMaterials(true); // Marcar como inicializado
      return true; // Indicar éxito
    } catch (error) {
      console.error("Error initializing default materials:", error);
      toast({
        variant: "destructive",
        title: "Error al Inicializar Materiales",
        description: "No se pudo crear la lista de materiales estándar.",
      });
      return false; // Indicar fallo
    } finally {
       // No quitar setIsLoading(false) aquí, fetchMaterials lo hará
    }
  }, [getMaterialsCollectionRef, toast, user, db]);


  const fetchMaterials = React.useCallback(async (forceInitializeIfEmpty = false) => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef) {
      if (user) { // Solo si hay usuario pero la ref es null (db no listo?)
          toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));

      if (querySnapshot.empty && !hasInitializedMaterials && user) {
        const success = await initializeDefaultMaterials();
        if (success) {
          // Volver a cargar los materiales después de inicializarlos
          const newSnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
          const materialsList = newSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
          );
          setMaterials(materialsList);
        } else {
          setMaterials([]); // Dejar vacío si la inicialización falló
        }
      } else {
        const materialsList = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
        );
        setMaterials(materialsList);
        if (!querySnapshot.empty) {
            setHasInitializedMaterials(true); // Si ya hay materiales, marcamos como inicializado
        }
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Materiales",
        description: "No se pudieron cargar los materiales.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getMaterialsCollectionRef, toast, initializeDefaultMaterials, hasInitializedMaterials, user]);


  React.useEffect(() => {
    document.title = 'Gestión de Materiales | ZYCLE';
    if (user) { // Solo intentar cargar si hay un usuario
      fetchMaterials();
    } else {
      setIsLoading(false); // Si no hay usuario, no hay nada que cargar
      setMaterials([]); // Limpiar materiales si el usuario cierra sesión
      setHasInitializedMaterials(false); // Resetear estado de inicialización
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
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el material." });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(materialsCollectionRef, materialToDelete.id));
      toast({
        title: "Material Eliminado",
        description: `El material "${materialToDelete.name}" ha sido eliminado.`,
      });
      fetchMaterials(); // Refresh list
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el material.",
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
      toast({ variant: "destructive", title: "Error", description: "La base de datos no está disponible o no ha iniciado sesión." });
      return;
    }
    setIsSubmitting(true);
    const materialData = {
      ...data,
      price: parseFloat(Number(data.price).toFixed(2)),
    };

    try {
      if (editingMaterial) {
        const materialRef = doc(materialsCollectionRef, editingMaterial.id);
        await updateDoc(materialRef, {
          ...materialData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Material Actualizado",
          description: `El material "${data.name}" ha sido actualizado.`,
        });
      } else {
        await addDoc(materialsCollectionRef, {
          ...materialData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Material Agregado",
          description: `El material "${data.name}" ha sido agregado.`,
        });
      }
      setIsFormOpen(false);
      setEditingMaterial(null);
      fetchMaterials(); 
    } catch (error) {
      console.error("Error saving material:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar el material.",
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
                    <CardTitle className="text-2xl font-headline text-primary">Gestión de Materiales</CardTitle>
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
              Gestión de Materiales
            </CardTitle>
            <CardDescription>
              Añada, edite o elimine los tipos de materiales y sus precios para su empresa.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : materials.length === 0 && hasInitializedMaterials ? ( // Mostrar si no hay materiales PERO la inicialización ya ocurrió
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay materiales registrados</h3>
                <p className="text-muted-foreground mb-6">Añada un nuevo material utilizando el botón flotante.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Precio (COP)</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell className="text-right">{formatPrice(material.price)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                        onClick={() => handleEditMaterial(material)}
                        aria-label="Editar material"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive"
                        onClick={() => openDeleteDialog(material)}
                        aria-label="Eliminar material"
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
        aria-label="Agregar nuevo material"
        disabled={!user || isLoading} // Deshabilitar si no hay usuario o está cargando
      >
        <Plus className="h-8 w-8" />
      </Button>

      <MaterialForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingMaterial || {}}
        isLoading={isSubmitting}
        title={editingMaterial ? "Editar Material" : "Agregar Nuevo Material"}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este material?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El material "{materialToDelete?.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaterialToDelete(null)}>Cancelar</AlertDialogCancel>
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
