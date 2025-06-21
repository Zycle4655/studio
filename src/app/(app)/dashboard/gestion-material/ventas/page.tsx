
"use client";

import * as React from "react";
import { Plus, FileText, Trash2, Edit, PackageOpen, DollarSign } from "lucide-react";
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
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  limit,
  writeBatch,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import VentaMaterialItemForm from "@/components/forms/VentaMaterialItemForm";
import FacturaVentaForm from "@/components/forms/FacturaVentaForm";
import type { VentaMaterialItemFormData, VentaMaterialItem, FacturaVentaFormData, FacturaVentaDocument } from "@/schemas/venta";
import type { MaterialDocument } from "@/schemas/material";
import type { CompanyProfileDocument } from "@/schemas/company";
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


export default function VentaMaterialPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true); 
  const [isSubmitting, setIsSubmitting] = React.useState(false); 
  const [isFetchingCompanyProfile, setIsFetchingCompanyProfile] = React.useState(false);

  const [availableMaterials, setAvailableMaterials] = React.useState<MaterialDocument[]>([]);
  const [currentSaleItems, setCurrentSaleItems] = React.useState<VentaMaterialItem[]>([]);
  const [companyProfileData, setCompanyProfileData] = React.useState<CompanyProfileDocument | null>(null);
  const [nextNumeroFactura, setNextNumeroFactura] = React.useState<number | null>(null);

  const [isAddItemFormOpen, setIsAddItemFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<VentaMaterialItem | null>(null); 
  const [itemIndexToEdit, setItemIndexToEdit] = React.useState<number | null>(null);

  const [itemToDelete, setItemToDelete] = React.useState<VentaMaterialItem | null>(null);
  const [itemIndexToDelete, setItemIndexToDelete] = React.useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [isFacturaFormOpen, setIsFacturaFormOpen] = React.useState(false);


  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "materials");
  }, [user]);

  const getSaleInvoicesCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "saleInvoices");
  }, [user]);
  
  const getCompanyProfileRef = React.useCallback(() => {
    if (!user || !db) return null;
    return doc(db, "companyProfiles", user.uid);
  }, [user]);


  const fetchAvailableMaterials = React.useCallback(async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    if (!materialsCollectionRef) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
      const materialsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
      );
      setAvailableMaterials(materialsList);
    } catch (error) {
      console.error("Error fetching available materials:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Materiales Disponibles",
        description: "No se pudieron cargar los materiales para la venta.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getMaterialsCollectionRef, toast]);

  React.useEffect(() => {
    document.title = 'Venta de Materiales | ZYCLE';
    if (user) {
      fetchAvailableMaterials();
    } else {
      setIsLoading(false);
      setAvailableMaterials([]);
      setCurrentSaleItems([]);
      setCompanyProfileData(null);
    }
  }, [user, fetchAvailableMaterials]);

  const handleOpenAddItemForm = (item?: VentaMaterialItem, index?: number) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar ítems." });
        return;
    }
    setEditingItem(item || null);
    setItemIndexToEdit(index !== undefined ? index : null);
    setIsAddItemFormOpen(true);
  };

  const handleAddItemToSale = (data: VentaMaterialItemFormData) => {
    const selectedMaterial = availableMaterials.find(m => m.id === data.materialId);
    if (!selectedMaterial) {
      toast({ variant: "destructive", title: "Error", description: "Material no encontrado." });
      return;
    }

    // --- Stock Validation ---
    const availableStock = selectedMaterial.stock || 0;
    const isEditing = editingItem && itemIndexToEdit !== null;

    // Calculate weight of the same material already in the cart, excluding the item being edited
    const weightInCart = currentSaleItems
        .filter(item => item.materialId === data.materialId && item.id !== editingItem?.id)
        .reduce((sum, item) => sum + item.peso, 0);

    const totalRequestedWeight = weightInCart + data.peso;
    
    if (totalRequestedWeight > availableStock) {
        toast({ 
            variant: "destructive", 
            title: "Stock Insuficiente", 
            description: `Solo hay ${availableStock.toLocaleString('es-CO')} kg de ${selectedMaterial.name}. Usted intenta vender ${totalRequestedWeight.toLocaleString('es-CO')} kg.`,
            duration: 5000,
        });
        return;
    }
    // --- End Stock Validation ---

    const newItem: VentaMaterialItem = {
      id: editingItem?.id || Date.now().toString(), 
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialCode: selectedMaterial.code || null,
      peso: data.peso,
      precioUnitario: data.precioUnitario || selectedMaterial.price, 
      subtotal: data.peso * (data.precioUnitario || selectedMaterial.price),
    };

    if (isEditing) {
      const updatedItems = [...currentSaleItems];
      updatedItems[itemIndexToEdit] = newItem;
      setCurrentSaleItems(updatedItems);
      toast({ title: "Ítem Actualizado", description: `${newItem.materialName} actualizado en la venta.` });
    } else {
      setCurrentSaleItems(prevItems => [...prevItems, newItem]);
      toast({ title: "Ítem Agregado", description: `${newItem.materialName} agregado a la venta.` });
    }
    
    setIsAddItemFormOpen(false);
    setEditingItem(null);
    setItemIndexToEdit(null);
  };
  
  const openDeleteDialog = (item: VentaMaterialItem, index: number) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para eliminar ítems." });
        return;
    }
    setItemToDelete(item);
    setItemIndexToDelete(index);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = () => {
    if (itemIndexToDelete === null) return;
    setCurrentSaleItems(prevItems => prevItems.filter((_, i) => i !== itemIndexToDelete));
    toast({ title: "Ítem Eliminado", description: `El ítem "${itemToDelete?.materialName}" ha sido eliminado de la venta.` });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
    setItemIndexToDelete(null);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const calculateTotal = () => {
    return currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleOpenFacturaForm = async () => {
    if (currentSaleItems.length === 0) {
        toast({ variant: "destructive", title: "Venta Vacía", description: "Agregue al menos un material antes de facturar." });
        return;
    }
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para facturar." });
        return;
    }

    setIsFetchingCompanyProfile(true);
    try {
      if (!companyProfileData) {
        const profileRef = getCompanyProfileRef();
        if (profileRef) {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setCompanyProfileData(profileSnap.data() as CompanyProfileDocument);
          } else {
            toast({ variant: "destructive", title: "Perfil no encontrado", description: "No se pudo cargar el perfil de la empresa. Por favor, complete el perfil en 'Configuración'." });
            setIsFetchingCompanyProfile(false);
            return;
          }
        } else {
             toast({ variant: "destructive", title: "Error", description: "No se pudo obtener la referencia al perfil de la empresa." });
             setIsFetchingCompanyProfile(false);
             return;
        }
      }

      const invoicesRef = getSaleInvoicesCollectionRef();
      if (invoicesRef) {
        const q = query(invoicesRef, orderBy("numeroFactura", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setNextNumeroFactura(1);
        } else {
          const lastFactura = querySnapshot.docs[0].data() as FacturaVentaDocument;
          setNextNumeroFactura((lastFactura.numeroFactura || 0) + 1);
        }
      } else {
         toast({ variant: "destructive", title: "Error", description: "No se pudo obtener la referencia a las facturas." });
         setIsFetchingCompanyProfile(false);
         return;
      }

      setIsFacturaFormOpen(true);
    } catch (error) {
      console.error("Error preparing factura form:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo preparar el formulario de facturación." });
    } finally {
        setIsFetchingCompanyProfile(false);
    }
  };

  const handleSaveFactura = async (formData: FacturaVentaFormData) => {
    const invoicesRef = getSaleInvoicesCollectionRef();
    const materialsRef = getMaterialsCollectionRef();
    if (!invoicesRef || !materialsRef || !user || nextNumeroFactura === null) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la factura. Faltan datos o conexión." });
      return;
    }
    setIsSubmitting(true);
    try {
      const total = calculateTotal();
      const facturaData: FacturaVentaDocument = {
        userId: user.uid,
        fecha: formData.fecha, 
        items: currentSaleItems,
        totalFactura: total,
        numeroFactura: nextNumeroFactura,
        formaDePago: formData.formaDePago,
        clienteNombre: formData.clienteNombre || null,
        observaciones: formData.observaciones || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const batch = writeBatch(db);
      const newFacturaRef = doc(invoicesRef); 
      batch.set(newFacturaRef, facturaData);
      
      // Update stock for each item in the sale (DECREMENT)
      currentSaleItems.forEach(item => {
        const materialDocRef = doc(materialsRef, item.materialId);
        batch.update(materialDocRef, { stock: increment(-item.peso) });
      });

      await batch.commit();

      toast({ title: "Factura Guardada", description: `La factura N° ${nextNumeroFactura} ha sido guardada y el inventario actualizado.` });
      setCurrentSaleItems([]);
      setIsFacturaFormOpen(false);
      setNextNumeroFactura(null); 
      fetchAvailableMaterials(); // Re-fetch materials to update stock in UI

    } catch (error) {
      console.error("Error saving factura:", error);
      toast({ variant: "destructive", title: "Error al Guardar Factura", description: "No se pudo guardar la factura o actualizar el inventario." });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Venta de Materiales</CardTitle>
                    <CardDescription>Por favor, inicie sesión para registrar ventas.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Debe iniciar sesión para ver esta página.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (isLoading && availableMaterials.length === 0) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2"/>
                    <Skeleton className="h-5 w-1/2"/>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-md"/>
                        ))}
                    </div>
                     <div className="fixed bottom-8 right-8 flex flex-col space-y-3">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }


  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-primary">
              Registrar Venta de Material
            </CardTitle>
            <CardDescription>
              Añada los materiales vendidos y genere una factura. El inventario se actualizará automáticamente.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {currentSaleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Aún no hay materiales en esta venta</h3>
              <p className="text-muted-foreground mb-6">Use el botón "+" para agregar el primer material.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Precio Unit. (COP)</TableHead>
                    <TableHead className="text-right">Subtotal (COP)</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSaleItems.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell>{item.materialCode || "N/A"}</TableCell>
                      <TableCell className="text-right">{item.peso.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.precioUnitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-primary"
                          onClick={() => handleOpenAddItemForm(item, index)}
                          aria-label="Editar ítem"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive"
                          onClick={() => openDeleteDialog(item, index)}
                          aria-label="Eliminar ítem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 text-right">
                <p className="text-lg font-semibold">
                  Total Venta: <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones Flotantes */}
      <div className="fixed bottom-8 right-8 flex flex-col space-y-3">
        <Button
          className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform bg-green-600 hover:bg-green-700"
          size="icon"
          onClick={handleOpenFacturaForm}
          aria-label="Facturar Venta"
          disabled={!user || currentSaleItems.length === 0 || isSubmitting || isFetchingCompanyProfile}
        >
          {isFetchingCompanyProfile ? <span className="animate-spin h-8 w-8 border-2 border-background rounded-full border-t-transparent"></span> : <FileText className="h-8 w-8" />}
        </Button>
        <Button
          className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
          size="icon"
          onClick={() => handleOpenAddItemForm()}
          aria-label="Agregar nuevo material a la venta"
          disabled={!user || isLoading || availableMaterials.length === 0}
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>

      {availableMaterials.length > 0 && (
        <VentaMaterialItemForm
          isOpen={isAddItemFormOpen}
          setIsOpen={setIsAddItemFormOpen}
          onSubmit={handleAddItemToSale}
          materials={availableMaterials}
          defaultValues={editingItem ? { materialId: editingItem.materialId, peso: editingItem.peso, precioUnitario: editingItem.precioUnitario } : undefined}
          isLoading={isSubmitting} 
          title={editingItem ? "Editar Ítem de Venta" : "Agregar Ítem a la Venta"}
          currentSaleItems={currentSaleItems}
          isEditingInvoiceItem={!!editingItem}
        />
      )}
      {availableMaterials.length === 0 && isAddItemFormOpen && (
          <AlertDialog open={isAddItemFormOpen} onOpenChange={setIsAddItemFormOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>No hay materiales disponibles</AlertDialogTitle>
                <AlertDialogDescription>
                  Primero debe registrar materiales en la sección "Gestión de Material {'>'} Materiales" y tener stock disponible para poder venderlos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsAddItemFormOpen(false)}>Entendido</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      )}

      {isFacturaFormOpen && companyProfileData && nextNumeroFactura !== null && (
        <FacturaVentaForm
            isOpen={isFacturaFormOpen}
            setIsOpen={setIsFacturaFormOpen}
            onSubmit={handleSaveFactura}
            isLoading={isSubmitting}
            ventaItems={currentSaleItems}
            totalVenta={calculateTotal()}
            nextNumeroFactura={nextNumeroFactura}
            companyProfile={companyProfileData}
            userEmail={user?.email || null}
        />
      )}


      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ítem de la venta?</AlertDialogTitle>
            <AlertDialogDescription>
              El ítem "{itemToDelete?.materialName}" será eliminado de la lista de venta actual. Esta acción no se puede deshacer para esta sesión de venta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setItemToDelete(null); setItemIndexToDelete(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isSubmitting} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar Ítem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
