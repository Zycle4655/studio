
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Briefcase } from "lucide-react";
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
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
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
import CargoForm from "@/components/forms/CargoForm";
import type { CargoFormData, CargoDocument } from "@/schemas/cargo";
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

// Lock to prevent multiple initializations in one session
let initializationLock = false;

// Default roles to be created for new users
const DEFAULT_CARGOS = [
  { name: "Auxiliar administrativo" },
  { name: "Conductor" },
  { name: "Gestor ambiental" },
];


export default function CargosPage() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [cargos, setCargos] = React.useState<CargoDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCargo, setEditingCargo] = React.useState<CargoDocument | null>(null);

  const [cargoToDelete, setCargoToDelete] = React.useState<CargoDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const getCargosCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "cargos");
  }, [user]);

  const initializeDefaultCargos = React.useCallback(async () => {
    const cargosCollectionRef = getCargosCollectionRef();
    if (!cargosCollectionRef || !db) return false;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_CARGOS.forEach(cargo => {
        const newCargoRef = doc(cargosCollectionRef);
        batch.set(newCargoRef, {
          ...cargo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({
        title: "Lista de Cargos Creada",
        description: "Se ha creado una lista de cargos por defecto para su empresa.",
      });
      return true;
    } catch (error) {
      console.error("Error initializing default cargos:", error);
      toast({
        variant: "destructive",
        title: "Error al Inicializar Cargos",
        description: "No se pudo crear la lista de cargos estándar para su empresa.",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [getCargosCollectionRef, toast]);


  const fetchCargos = React.useCallback(async () => {
    const collectionRef = getCargosCollectionRef();
    if (!collectionRef) {
      if (user) {
          toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let querySnapshot = await getDocs(query(collectionRef, orderBy("name", "asc")));
      
      // Logic to initialize default roles for a new user
      if (querySnapshot.empty && !initializationLock) {
        initializationLock = true;
        const success = await initializeDefaultCargos();
        if (success) {
          // Re-fetch cargos after successful initialization
          querySnapshot = await getDocs(query(collectionRef, orderBy("name", "asc")));
        }
      }

      const list = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as CargoDocument)
      );
      setCargos(list);

    } catch (error) {
      console.error("Error fetching cargos:", error);
      toast({ variant: "destructive", title: "Error al Cargar Cargos", description: "No se pudieron cargar los cargos." });
      setCargos([]); 
    } finally {
      setIsLoading(false);
    }
  }, [user, getCargosCollectionRef, toast, initializeDefaultCargos]);


  React.useEffect(() => {
    document.title = 'Gestionar Cargos | ZYCLE';
    if (user) {
      fetchCargos();
    } else {
      setIsLoading(false);
      setCargos([]);
    }
    // Reset the lock when the user changes or logs out
    return () => {
        initializationLock = false;
    }
  }, [user, fetchCargos]);


  const handleAddCargo = () => {
    setEditingCargo(null);
    setIsFormOpen(true);
  };

  const handleEditCargo = (cargo: CargoDocument) => {
    setEditingCargo(cargo);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (cargo: CargoDocument) => {
    setCargoToDelete(cargo);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCargo = async () => {
    const collectionRef = getCargosCollectionRef();
    if (!cargoToDelete || !collectionRef) return;
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(collectionRef, cargoToDelete.id));
      toast({ title: "Cargo Eliminado", description: `El cargo "${cargoToDelete.name}" ha sido eliminado.` });
      fetchCargos();
    } catch (error) {
      console.error("Error deleting cargo:", error);
      toast({ variant: "destructive", title: "Error al Eliminar", description: "No se pudo eliminar el cargo." });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setCargoToDelete(null);
    }
  };

  const handleFormSubmit = async (data: CargoFormData) => {
    const collectionRef = getCargosCollectionRef();
    if (!collectionRef) return;
    
    setIsSubmitting(true);
    try {
      if (editingCargo) {
        const cargoRef = doc(collectionRef, editingCargo.id);
        await updateDoc(cargoRef, { name: data.name, updatedAt: serverTimestamp() });
        toast({ title: "Cargo Actualizado", description: `El cargo "${data.name}" ha sido actualizado.` });
      } else {
        await addDoc(collectionRef, { name: data.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: "Cargo Agregado", description: `El cargo "${data.name}" ha sido agregado.` });
      }
      setIsFormOpen(false);
      setEditingCargo(null);
      fetchCargos();
    } catch (error) {
      console.error("Error saving cargo:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el cargo." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestionar Cargos</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12"><p>Debe iniciar sesión para ver esta página.</p></CardContent>
            </Card>
        </div>
    );
  }

  // Only admins can manage roles
  if (role !== 'admin' && !isLoading) {
      return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                 <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary flex items-center"><Briefcase className="mr-3 h-7 w-7" />Gestionar Cargos</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12"><p>No tiene permiso para acceder a esta sección.</p></CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Briefcase className="mr-3 h-7 w-7" />
                Gestionar Cargos
              </CardTitle>
              <CardDescription>
                Cree, edite o elimine los cargos que pueden ser asignados a los colaboradores.
              </CardDescription>
            </div>
             <Button onClick={handleAddCargo} disabled={isSubmitting || isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cargo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <Skeleton className="h-5 w-40" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : cargos.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay cargos registrados</h3>
                <p className="text-muted-foreground mb-6">Utilice el botón "Agregar Cargo" para crear el primero.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Cargo</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargos.map((cargo) => (
                  <TableRow key={cargo.id}>
                    <TableCell className="font-medium">{cargo.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                        onClick={() => handleEditCargo(cargo)}
                        aria-label="Editar cargo"
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive"
                        onClick={() => openDeleteDialog(cargo)}
                        aria-label="Eliminar cargo"
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

      <CargoForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingCargo ?? undefined}
        isLoading={isSubmitting}
        title={editingCargo ? "Editar Cargo" : "Agregar Nuevo Cargo"}
        description={editingCargo ? "Actualice el nombre del cargo." : "Cree un nuevo cargo para su equipo."}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cargo "{cargoToDelete?.name}" será eliminado. Asegúrese de que ningún colaborador lo tenga asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCargoToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCargo}
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
