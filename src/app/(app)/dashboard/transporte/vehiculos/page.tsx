
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Search, Truck } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import VehiculoForm from "@/components/forms/VehiculoForm";
import type { VehiculoFormData, VehiculoDocument } from "@/schemas/vehiculo";
import { TIPOS_VEHICULO } from "@/schemas/vehiculo";
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


export default function VehiculosPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, permissions } = useAuth();
  const [vehiculos, setVehiculos] = React.useState<VehiculoDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingVehiculo, setEditingVehiculo] = React.useState<VehiculoDocument | null>(null);

  const [vehiculoToDelete, setVehiculoToDelete] = React.useState<VehiculoDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");

  const getVehiculosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "vehiculos");
  }, [companyOwnerId]);

  const fetchVehiculos = React.useCallback(async () => {
    const vehiculosCollectionRef = getVehiculosCollectionRef();
    if (!vehiculosCollectionRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const q = query(vehiculosCollectionRef, orderBy("placa", "asc"));
      const querySnapshot = await getDocs(q);
      const vehiculosList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as VehiculoDocument)
      );
      setVehiculos(vehiculosList);
    } catch (error) {
      console.error("Error fetching vehiculos:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Vehículos",
        description: "No se pudieron cargar los vehículos.",
      });
      setVehiculos([]); 
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, getVehiculosCollectionRef, toast]);


  React.useEffect(() => {
    document.title = 'Transporte: Vehículos | ZYCLE';
    if (companyOwnerId && permissions?.transporte) {
      fetchVehiculos();
    } else {
      setIsLoading(false);
    }
  }, [companyOwnerId, permissions, fetchVehiculos]);

  const handleAddVehiculo = () => {
    if (!user || !permissions?.transporte) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para agregar vehículos." });
        return;
    }
    setEditingVehiculo(null);
    setIsFormOpen(true);
  };

  const handleEditVehiculo = (vehiculo: VehiculoDocument) => {
     if (!user || !permissions?.transporte) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para editar vehículos." });
        return;
    }
    setEditingVehiculo(vehiculo);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (vehiculo: VehiculoDocument) => {
    if (!user || !permissions?.transporte) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para eliminar vehículos." });
        return;
    }
    setVehiculoToDelete(vehiculo);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteVehiculo = async () => {
    const vehiculosCollectionRef = getVehiculosCollectionRef();
    if (!vehiculoToDelete || !vehiculosCollectionRef) return;
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(vehiculosCollectionRef, vehiculoToDelete.id));
      toast({
        title: "Vehículo Eliminado",
        description: `El vehículo con placa "${vehiculoToDelete.placa}" ha sido eliminado.`,
      });
      await fetchVehiculos();
    } catch (error) {
      console.error("Error deleting vehiculo:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el vehículo.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setVehiculoToDelete(null);
    }
  };

  const handleFormSubmit = async (data: VehiculoFormData) => {
    const vehiculosCollectionRef = getVehiculosCollectionRef();
    if (!vehiculosCollectionRef) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingVehiculo) {
        const vehiculoRef = doc(vehiculosCollectionRef, editingVehiculo.id);
        await updateDoc(vehiculoRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Vehículo Actualizado",
          description: `El vehículo con placa "${data.placa}" ha sido actualizado.`,
        });
      } else {
        await addDoc(vehiculosCollectionRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Vehículo Agregado",
          description: `El vehículo con placa "${data.placa}" ha sido agregado.`,
        });
      }
      setIsFormOpen(false);
      setEditingVehiculo(null);
      await fetchVehiculos();
    } catch (error) {
      console.error("Error saving vehiculo:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar el vehículo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVehiculos = vehiculos.filter(vehiculo => {
    const term = searchTerm.toLowerCase();
    const placaMatch = vehiculo.placa.toLowerCase().includes(term);
    const marcaMatch = vehiculo.marca.toLowerCase().includes(term);
    return placaMatch || marcaMatch;
  });

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Gestionar Vehículos</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Debe iniciar sesión para ver esta página.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!permissions?.transporte) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary flex items-center">
                        <Truck className="mr-3 h-7 w-7" />
                        Gestión de Vehículos
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No tiene permiso para acceder a esta funcionalidad.</p>
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
                <Truck className="mr-3 h-7 w-7" />
                Gestionar Vehículos
              </CardTitle>
              <CardDescription>
                Añada, edite o elimine los vehículos de su flota.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa o marca..."
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
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : vehiculos.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Truck className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay vehículos registrados</h3>
                <p className="text-muted-foreground mb-6">Utilice el botón "+" para registrar el primer vehículo.</p>
            </div>
          ) : filteredVehiculos.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
                <p className="text-muted-foreground">Ningún vehículo coincide con "{searchTerm}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredVehiculos.map((vehiculo) => (
                    <TableRow key={vehiculo.id}>
                        <TableCell className="font-medium font-mono">{vehiculo.placa}</TableCell>
                        <TableCell>{vehiculo.marca}</TableCell>
                        <TableCell>{vehiculo.modelo}</TableCell>
                        <TableCell><Badge variant="outline">{TIPOS_VEHICULO[vehiculo.tipo]}</Badge></TableCell>
                        <TableCell className="text-right">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-primary"
                            onClick={() => handleEditVehiculo(vehiculo)}
                            aria-label="Editar vehículo"
                            disabled={isSubmitting}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive"
                            onClick={() => openDeleteDialog(vehiculo)}
                            aria-label="Eliminar vehículo"
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
      
      <Button
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
          size="icon"
          onClick={handleAddVehiculo}
          aria-label="Agregar nuevo vehículo"
          disabled={!user || isLoading || isSubmitting}
      >
          <Plus className="h-8 w-8" />
      </Button>

      <VehiculoForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingVehiculo || undefined}
        isLoading={isSubmitting}
        title={editingVehiculo ? "Editar Vehículo" : "Agregar Nuevo Vehículo"}
        description={editingVehiculo ? "Actualice la información del vehículo." : "Complete los datos del nuevo vehículo de su flota."}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El vehículo con placa "{vehiculoToDelete?.placa}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVehiculoToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehiculo}
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
