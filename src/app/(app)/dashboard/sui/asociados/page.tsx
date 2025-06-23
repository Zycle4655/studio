
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Users, Search } from "lucide-react";
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
import AsociadoForm from "@/components/forms/AsociadoForm";
import type { AsociadoFormData, AsociadoDocument } from "@/schemas/sui";
import { TIPOS_IDENTIFICACION } from "@/schemas/sui";
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

export default function AsociadosPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [asociados, setAsociados] = React.useState<AsociadoDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAsociado, setEditingAsociado] = React.useState<AsociadoDocument | null>(null);

  const [asociadoToDelete, setAsociadoToDelete] = React.useState<AsociadoDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");

  const getAsociadosCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "asociados");
  }, [user]);

  const fetchAsociados = React.useCallback(async () => {
    const asociadosCollectionRef = getAsociadosCollectionRef();
    if (!asociadosCollectionRef) {
      if (user) {
          toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(asociadosCollectionRef, orderBy("nombre", "asc"));
      const querySnapshot = await getDocs(q);
      const asociadosList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AsociadoDocument)
      );
      setAsociados(asociadosList);
    } catch (error) {
      console.error("Error fetching asociados:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Asociados",
        description: "No se pudieron cargar los asociados.",
      });
      setAsociados([]); 
    } finally {
      setIsLoading(false);
    }
  }, [user, getAsociadosCollectionRef, toast]);


  React.useEffect(() => {
    document.title = 'Gestión de Asociados | ZYCLE';
    if (user) {
      fetchAsociados();
    } else {
      setIsLoading(false);
      setAsociados([]);
    }
  }, [user, fetchAsociados]);

  const handleAddAsociado = () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar asociados." });
        return;
    }
    setEditingAsociado(null);
    setIsFormOpen(true);
  };

  const handleEditAsociado = (asociado: AsociadoDocument) => {
     if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para editar asociados." });
        return;
    }
    setEditingAsociado(asociado);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (asociado: AsociadoDocument) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para eliminar asociados." });
        return;
    }
    setAsociadoToDelete(asociado);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAsociado = async () => {
    const asociadosCollectionRef = getAsociadosCollectionRef();
    if (!asociadoToDelete || !asociadosCollectionRef) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el asociado." });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(asociadosCollectionRef, asociadoToDelete.id));
      toast({
        title: "Asociado Eliminado",
        description: `El asociado "${asociadoToDelete.nombre}" ha sido eliminado.`,
      });
      fetchAsociados();
    } catch (error) {
      console.error("Error deleting asociado:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el asociado.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setAsociadoToDelete(null);
    }
  };

  const handleFormSubmit = async (data: AsociadoFormData) => {
    const asociadosCollectionRef = getAsociadosCollectionRef();
    if (!asociadosCollectionRef) {
      toast({ variant: "destructive", title: "Error", description: "La base de datos no está disponible." });
      return;
    }
    setIsSubmitting(true);
    const asociadoData = {
      ...data,
      numacro: data.numacro ?? null,
      nueca: data.nueca ?? null,
      placaVehiculo: data.placaVehiculo || null,
    };

    try {
      if (editingAsociado) {
        const asociadoRef = doc(asociadosCollectionRef, editingAsociado.id);
        await updateDoc(asociadoRef, {
          ...asociadoData,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Asociado Actualizado",
          description: `El asociado "${data.nombre}" ha sido actualizado.`,
        });
      } else {
        await addDoc(asociadosCollectionRef, {
          ...asociadoData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Asociado Agregado",
          description: `El asociado "${data.nombre}" ha sido agregado.`,
        });
      }
      setIsFormOpen(false);
      setEditingAsociado(null);
      fetchAsociados();
    } catch (error) {
      console.error("Error saving asociado:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar el asociado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAsociados = asociados.filter(asociado => {
    const term = searchTerm.toLowerCase();
    const nameMatch = asociado.nombre.toLowerCase().includes(term);
    const idMatch = asociado.numeroIdentificacion.toLowerCase().includes(term);
    return nameMatch || idMatch;
  });

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestión de Asociados</CardTitle>
                    <CardDescription>Por favor, inicie sesión para administrar los asociados.</CardDescription>
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
                <Users className="mr-3 h-7 w-7" />
                Gestión de Asociados
              </CardTitle>
              <CardDescription>
                Añada, edite, elimine o busque los asociados de su empresa.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button onClick={handleAddAsociado} disabled={isLoading || isSubmitting} className="flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>
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
          ) : asociados.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay asociados registrados</h3>
                <p className="text-muted-foreground mb-6">Utilice el botón "Agregar" para registrar el primero.</p>
            </div>
          ) : filteredAsociados.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
                <p className="text-muted-foreground">Ningún asociado coincide con "{searchTerm}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Identificación</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Placa Vehículo</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAsociados.map((asociado) => (
                    <TableRow key={asociado.id}>
                        <TableCell className="font-medium">{asociado.nombre}</TableCell>
                        <TableCell>
                            <Badge variant="secondary">{TIPOS_IDENTIFICACION[asociado.tipoIdentificacion]}</Badge> {asociado.numeroIdentificacion}
                        </TableCell>
                        <TableCell>{asociado.telefono}</TableCell>
                        <TableCell>{asociado.placaVehiculo || <span className="text-muted-foreground italic text-xs">N/A</span>}</TableCell>
                        <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-primary"
                            onClick={() => handleEditAsociado(asociado)}
                            aria-label="Editar asociado"
                            disabled={isSubmitting}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            onClick={() => openDeleteDialog(asociado)}
                            aria-label="Eliminar asociado"
                            disabled={isSubmitting}
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

      <AsociadoForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingAsociado || {}}
        isLoading={isSubmitting}
        title={editingAsociado ? "Editar Asociado" : "Agregar Nuevo Asociado"}
        description={editingAsociado ? "Actualice la información del asociado." : "Complete los datos del nuevo asociado."}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este asociado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El asociado "{asociadoToDelete?.nombre}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAsociadoToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsociado}
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
