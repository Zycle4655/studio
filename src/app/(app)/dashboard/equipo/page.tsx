
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Users, Search, UserCog } from "lucide-react";
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
import { db, auth, firebaseConfig } from "@/lib/firebase";
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
  setDoc,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import CollaboratorForm from "@/components/forms/CollaboratorForm";
import type { CollaboratorFormData, CollaboratorDocument } from "@/schemas/equipo";
import type { CargoDocument } from "@/schemas/cargo";
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
import { Badge } from "@/components/ui/badge";


export default function EquipoPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, permissions } = useAuth();
  const [collaborators, setCollaborators] = React.useState<CollaboratorDocument[]>([]);
  const [cargos, setCargos] = React.useState<CargoDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCollaborator, setEditingCollaborator] = React.useState<CollaboratorDocument | null>(null);

  const [collaboratorToDelete, setCollaboratorToDelete] = React.useState<CollaboratorDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const getCollaboratorsCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "collaborators");
  }, [companyOwnerId]);

  const getCargosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "cargos");
  }, [companyOwnerId]);


  const fetchData = React.useCallback(async () => {
    const collaboratorsCollectionRef = getCollaboratorsCollectionRef();
    const cargosCollectionRef = getCargosCollectionRef();
    if (!collaboratorsCollectionRef || !cargosCollectionRef) {
      if (companyOwnerId) {
          toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch Cargos
      const cargosQuery = query(cargosCollectionRef, orderBy("name", "asc"));
      const cargosSnapshot = await getDocs(cargosQuery);
      const cargosList = cargosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CargoDocument));
      setCargos(cargosList);
      
      // Fetch Collaborators
      const collabsQuery = query(collaboratorsCollectionRef, orderBy("nombre", "asc"));
      const collabsSnapshot = await getDocs(collabsQuery);
      const collabsList = collabsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as CollaboratorDocument)
      );
      setCollaborators(collabsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Datos",
        description: "No se pudieron cargar los colaboradores o cargos.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, getCollaboratorsCollectionRef, getCargosCollectionRef, toast]);


  React.useEffect(() => {
    document.title = 'Gestión de Colaboradores | ZYCLE';
    if (companyOwnerId) {
      fetchData();
    } else {
      setIsLoading(false);
      setCollaborators([]);
      setCargos([]);
    }
  }, [companyOwnerId, fetchData]);

  const handleAddCollaborator = () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar colaboradores." });
        return;
    }
    setEditingCollaborator(null);
    setIsFormOpen(true);
  };

  const handleEditCollaborator = (collaborator: CollaboratorDocument) => {
     if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para editar." });
        return;
    }
    setEditingCollaborator(collaborator);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (collaborator: CollaboratorDocument) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para eliminar." });
        return;
    }
    setCollaboratorToDelete(collaborator);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCollaborator = async () => {
    const collectionRef = getCollaboratorsCollectionRef();
    if (!collaboratorToDelete || !collectionRef) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el colaborador." });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(collectionRef, collaboratorToDelete.id));
      toast({
        title: "Colaborador Eliminado",
        description: `El colaborador "${collaboratorToDelete.nombre}" ha sido eliminado.`,
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting collaborator:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el colaborador.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setCollaboratorToDelete(null);
    }
  };

  const handleFormSubmit = async (data: CollaboratorFormData) => {
    const adminUid = companyOwnerId;
    if (!adminUid) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al administrador. Por favor, recargue la página." });
        return;
    }

    setIsSubmitting(true);

    const collaboratorData = {
      nombre: data.nombre,
      email: data.email,
      permissions: data.permissions,
      rol: data.rol,
    };

    try {
      if (editingCollaborator) {
        const collectionRef = getCollaboratorsCollectionRef();
        if (!collectionRef) throw new Error("Database collection not available");

        const collaboratorRef = doc(collectionRef, editingCollaborator.id);
        await updateDoc(collaboratorRef, {
          ...collaboratorData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Colaborador Actualizado",
          description: `Los datos de "${data.nombre}" han sido actualizados.`,
        });
        fetchData();
      } else {
        if (!data.password) {
            toast({ variant: "destructive", title: "Error", description: "La contraseña es obligatoria para nuevos colaboradores." });
            setIsSubmitting(false);
            return;
        }

        // --- User Creation with Temporary App ---
        // This prevents the admin's auth state from being overwritten.
        const tempAppName = `temp-user-creation-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);
        let newAuthUserId = '';

        try {
            const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
            newAuthUserId = userCredential.user.uid;
        } catch (creationError) {
            // Re-throw the error to be caught by the outer catch block which has user-friendly messages
            throw creationError;
        } finally {
            // IMPORTANT: Always clean up the temporary app instance
            await deleteApp(tempApp);
        }

        if (!newAuthUserId) {
            throw new Error("No se pudo obtener el UID del nuevo usuario.");
        }
        
        const batch = writeBatch(db);

        // 1. Create the collaborator document in the admin's subcollection
        const collaboratorsCollectionRef = collection(db, "companyProfiles", adminUid, "collaborators");
        const newCollaboratorRef = doc(collaboratorsCollectionRef); // Auto-generate ID
        batch.set(newCollaboratorRef, {
          ...collaboratorData,
          authUid: newAuthUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 2. Create the user mapping document for easy lookup
        const userMappingRef = doc(db, "userMappings", newAuthUserId);
        batch.set(userMappingRef, { adminUid });
        
        await batch.commit();
        
        toast({
          title: "Colaborador Creado",
          description: `La cuenta para "${data.nombre}" ha sido creada exitosamente.`,
        });
        
        fetchData(); // Refresh list with the new collaborator
      }
      
      setIsFormOpen(false);
      setEditingCollaborator(null);

    } catch (error: any) {
      console.error("Error saving collaborator:", error);
      let errorMessage = "No se pudo guardar el colaborador.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "El correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestión de Equipo</CardTitle>
                    <CardDescription>Por favor, inicie sesión para administrar su equipo.</CardDescription>
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
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <UserCog className="mr-3 h-7 w-7" />
                Gestión de Colaboradores
              </CardTitle>
              <CardDescription>
                Añada, edite y gestione los permisos de los colaboradores que tendrán acceso a la plataforma.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : collaborators.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay colaboradores registrados</h3>
                <p className="text-muted-foreground mb-6">Utilice el botón "+" para registrar el primero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {collaborators.map((collaborator) => (
                    <TableRow key={collaborator.id}>
                        <TableCell className="font-medium">{collaborator.nombre}</TableCell>
                        <TableCell>{collaborator.email}</TableCell>
                        <TableCell>
                            <Badge variant="secondary">{collaborator.rol}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-primary"
                            onClick={() => handleEditCollaborator(collaborator)}
                            aria-label="Editar colaborador"
                            disabled={isSubmitting || !permissions?.equipo}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            onClick={() => openDeleteDialog(collaborator)}
                            aria-label="Eliminar colaborador"
                            disabled={isSubmitting || !permissions?.equipo}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {permissions?.equipo && (
        <Button
            className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
            size="icon"
            onClick={handleAddCollaborator}
            aria-label="Agregar nuevo colaborador"
            disabled={!companyOwnerId || isLoading || isSubmitting}
        >
            <Plus className="h-8 w-8" />
        </Button>
      )}


      <CollaboratorForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        cargos={cargos}
        defaultValues={editingCollaborator}
        isLoading={isSubmitting}
        title={editingCollaborator ? "Editar Colaborador" : "Agregar Nuevo Colaborador"}
        description={editingCollaborator ? "Actualice la información y permisos del colaborador." : "Complete los datos y asigne permisos para el nuevo colaborador."}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar a este colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El colaborador "{collaboratorToDelete?.nombre}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCollaboratorToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCollaborator}
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
