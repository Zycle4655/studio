
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Building, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
} from "firebase/firestore";
import FuenteForm from "@/components/forms/FuenteForm";
import type { FuenteFormData, FuenteDocument } from "@/schemas/fuente";
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

export default function GestionFuentesPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, permissions } = useAuth();
  const [fuentes, setFuentes] = React.useState<FuenteDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingFuente, setEditingFuente] = React.useState<FuenteDocument | null>(null);

  const [fuenteToDelete, setFuenteToDelete] = React.useState<FuenteDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");

  const getFuentesCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "fuentes");
  }, [companyOwnerId]);

  const fetchFuentes = React.useCallback(async () => {
    const fuentesCollectionRef = getFuentesCollectionRef();
    if (!fuentesCollectionRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(fuentesCollectionRef, orderBy("nombre", "asc"));
      const querySnapshot = await getDocs(q);
      const fuentesList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as FuenteDocument)
      );
      setFuentes(fuentesList);
    } catch (error) {
      console.error("Error fetching fuentes:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Fuentes",
        description: "No se pudieron cargar las fuentes de recolección. Verifique las reglas de seguridad de Firestore.",
      });
      setFuentes([]); 
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, getFuentesCollectionRef, toast]);


  React.useEffect(() => {
    document.title = 'Gestionar Fuentes | ZYCLE';
    if (companyOwnerId) {
      fetchFuentes();
    } else {
      setIsLoading(false);
    }
  }, [companyOwnerId, fetchFuentes]);

  const handleAddFuente = () => {
    if (!user || !permissions?.gestionMaterial) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para agregar fuentes." });
        return;
    }
    setEditingFuente(null);
    setIsFormOpen(true);
  };

  const handleEditFuente = (fuente: FuenteDocument) => {
     if (!user || !permissions?.gestionMaterial) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para editar fuentes." });
        return;
    }
    setEditingFuente(fuente);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (fuente: FuenteDocument) => {
    if (!user || !permissions?.gestionMaterial) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para eliminar fuentes." });
        return;
    }
    setFuenteToDelete(fuente);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteFuente = async () => {
    const fuentesCollectionRef = getFuentesCollectionRef();
    if (!fuenteToDelete || !fuentesCollectionRef) return;
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(fuentesCollectionRef, fuenteToDelete.id));
      toast({
        title: "Fuente Eliminada",
        description: `La fuente "${fuenteToDelete.nombre}" ha sido eliminada.`,
      });
      await fetchFuentes();
    } catch (error) {
      console.error("Error deleting fuente:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar la fuente.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setFuenteToDelete(null);
    }
  };

  const handleFormSubmit = async (data: FuenteFormData) => {
    const fuentesCollectionRef = getFuentesCollectionRef();
    if (!fuentesCollectionRef) return;
    
    setIsSubmitting(true);
    const fuenteData = {
      ...data,
      encargadoEmail: data.encargadoEmail || null,
    };
    
    try {
      if (editingFuente) {
        const fuenteRef = doc(fuentesCollectionRef, editingFuente.id);
        await updateDoc(fuenteRef, {
          ...fuenteData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Fuente Actualizada",
          description: `La fuente "${data.nombre}" ha sido actualizada.`,
        });
      } else {
        await addDoc(fuentesCollectionRef, {
          ...fuenteData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Fuente Agregada",
          description: `La fuente "${data.nombre}" ha sido agregada.`,
        });
      }
      setIsFormOpen(false);
      setEditingFuente(null);
      await fetchFuentes();
    } catch (error) {
      console.error("Error saving fuente:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar la fuente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFuentes = fuentes.filter(fuente => {
    const term = searchTerm.toLowerCase();
    const nameMatch = fuente.nombre.toLowerCase().includes(term);
    const addressMatch = fuente.direccion.toLowerCase().includes(term);
    return nameMatch || addressMatch;
  });

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestionar Fuentes</CardTitle>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Building className="mr-3 h-7 w-7" />
                Gestionar Fuentes
              </CardTitle>
              <CardDescription>
                Añada, edite o elimine las fuentes de recolección (ej: conjuntos residenciales, empresas).
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : fuentes.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay fuentes registradas</h3>
                <p className="text-muted-foreground mb-6">Utilice el botón "Agregar Fuente" para registrar la primera.</p>
            </div>
          ) : filteredFuentes.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
                <p className="text-muted-foreground">Ninguna fuente coincide con "{searchTerm}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre Fuente</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Encargado</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredFuentes.map((fuente) => (
                    <TableRow key={fuente.id}>
                        <TableCell className="font-medium">{fuente.nombre}</TableCell>
                        <TableCell>{fuente.direccion}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{fuente.encargadoNombre}</span>
                            <span className="text-xs text-muted-foreground">{fuente.encargadoTelefono}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-primary"
                            onClick={() => handleEditFuente(fuente)}
                            aria-label="Editar fuente"
                            disabled={isSubmitting || !permissions?.gestionMaterial}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            onClick={() => openDeleteDialog(fuente)}
                            aria-label="Eliminar fuente"
                            disabled={isSubmitting || !permissions?.gestionMaterial}
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
      
      {permissions?.gestionMaterial && (
        <Button
            className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
            size="icon"
            onClick={handleAddFuente}
            aria-label="Agregar nueva fuente"
            disabled={!user || isLoading || isSubmitting}
        >
            <Plus className="h-8 w-8" />
        </Button>
      )}

      <FuenteForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingFuente || undefined}
        isLoading={isSubmitting}
        title={editingFuente ? "Editar Fuente" : "Agregar Nueva Fuente"}
        description={editingFuente ? "Actualice la información de la fuente de recolección." : "Complete los datos de la nueva fuente de recolección."}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar esta fuente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La fuente "{fuenteToDelete?.nombre}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFuenteToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFuente}
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
