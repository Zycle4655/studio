
"use client";

import type { Metadata } from 'next';
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
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  limit,
  writeBatch,
  increment,
  where,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import CompraMaterialItemForm from "@/components/forms/CompraMaterialItemForm";
import FacturaCompraForm from "@/components/forms/FacturaCompraForm";
import type { CompraMaterialItemFormData, CompraMaterialItem, FacturaCompraFormData, FacturaCompraDocument } from "@/schemas/compra";
import type { MaterialDocument } from "@/schemas/material";
import type { CompanyProfileDocument } from "@/schemas/company";
import type { AsociadoDocument } from "@/schemas/sui";
import type { PrestamoDocument } from "@/schemas/prestamo";
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


export default function CompraMaterialPage() {
  const { toast } = useToast();
  const { user, companyOwnerId } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true); 
  const [isSubmitting, setIsSubmitting] = React.useState(false); 
  const [isFetchingCompanyProfile, setIsFetchingCompanyProfile] = React.useState(false);


  const [availableMaterials, setAvailableMaterials] = React.useState<MaterialDocument[]>([]);
  const [availableAsociados, setAvailableAsociados] = React.useState<AsociadoDocument[]>([]);
  const [pendingLoans, setPendingLoans] = React.useState<PrestamoDocument[]>([]);
  const [currentPurchaseItems, setCurrentPurchaseItems] = React.useState<CompraMaterialItem[]>([]);
  const [companyProfileData, setCompanyProfileData] = React.useState<CompanyProfileDocument | null>(null);
  const [nextNumeroFactura, setNextNumeroFactura] = React.useState<number | null>(null);


  const [isAddItemFormOpen, setIsAddItemFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CompraMaterialItem | null>(null); 
  const [itemIndexToEdit, setItemIndexToEdit] = React.useState<number | null>(null);

  const [itemToDelete, setItemToDelete] = React.useState<CompraMaterialItem | null>(null);
  const [itemIndexToDelete, setItemIndexToDelete] = React.useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [isFacturaFormOpen, setIsFacturaFormOpen] = React.useState(false);


  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "materials");
  }, [companyOwnerId]);

  const getAsociadosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "asociados");
  }, [companyOwnerId]);

  const getPurchaseInvoicesCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
  }, [companyOwnerId]);

  const getPrestamosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "prestamos");
  }, [companyOwnerId]);
  
  const getCompanyProfileRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return doc(db, "companyProfiles", companyOwnerId);
  }, [companyOwnerId]);


  const fetchInitialData = React.useCallback(async () => {
    const materialsCollectionRef = getMaterialsCollectionRef();
    const asociadosCollectionRef = getAsociadosCollectionRef();

    if (!materialsCollectionRef || !asociadosCollectionRef) {
      if (companyOwnerId) {
        toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch materials
      const matQuerySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
      const materialsList = matQuerySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
      );
      setAvailableMaterials(materialsList);

      // Fetch asociados
      const asocQuerySnapshot = await getDocs(query(asociadosCollectionRef, orderBy("nombre", "asc")));
      const asociadosList = asocQuerySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AsociadoDocument)
      );
      setAvailableAsociados(asociadosList);

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Datos",
        description: "No se pudieron cargar los materiales o asociados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getMaterialsCollectionRef, getAsociadosCollectionRef, companyOwnerId, toast]);

  React.useEffect(() => {
    document.title = 'Compra de Materiales | ZYCLE';
    if (companyOwnerId) {
      fetchInitialData();
    } else {
      setIsLoading(false);
      setAvailableMaterials([]);
      setAvailableAsociados([]);
      setCurrentPurchaseItems([]);
      setCompanyProfileData(null);
    }
  }, [companyOwnerId, fetchInitialData]);

  const handleOpenAddItemForm = (item?: CompraMaterialItem, index?: number) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar ítems." });
        return;
    }
    setEditingItem(item || null);
    setItemIndexToEdit(index !== undefined ? index : null);
    setIsAddItemFormOpen(true);
  };

  const handleAddItemToPurchase = (data: CompraMaterialItemFormData) => {
    const selectedMaterial = availableMaterials.find(m => m.id === data.materialId);
    if (!selectedMaterial) {
      toast({ variant: "destructive", title: "Error", description: "Material no encontrado." });
      return;
    }

    const newItem: CompraMaterialItem = {
      id: editingItem?.id || Date.now().toString(), 
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialCode: selectedMaterial.code || null,
      peso: data.peso,
      precioUnitario: selectedMaterial.price, 
      subtotal: data.peso * selectedMaterial.price,
    };

    if (editingItem && itemIndexToEdit !== null) {
      const updatedItems = [...currentPurchaseItems];
      updatedItems[itemIndexToEdit] = newItem;
      setCurrentPurchaseItems(updatedItems);
      toast({ title: "Ítem Actualizado", description: `${newItem.materialName} actualizado en la compra.` });
    } else {
      setCurrentPurchaseItems(prevItems => [...prevItems, newItem]);
      toast({ title: "Ítem Agregado", description: `${newItem.materialName} agregado a la compra.` });
    }
    
    setIsAddItemFormOpen(false);
    setEditingItem(null);
    setItemIndexToEdit(null);
  };
  
  const openDeleteDialog = (item: CompraMaterialItem, index: number) => {
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
    setCurrentPurchaseItems(prevItems => prevItems.filter((_, i) => i !== itemIndexToDelete));
    toast({ title: "Ítem Eliminado", description: `El ítem "${itemToDelete?.materialName}" ha sido eliminado de la compra.` });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
    setItemIndexToDelete(null);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const calculateTotal = () => {
    return currentPurchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleOpenFacturaForm = async () => {
    if (currentPurchaseItems.length === 0) {
        toast({ variant: "destructive", title: "Compra Vacía", description: "Agregue al menos un material antes de facturar." });
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

      const invoicesRef = getPurchaseInvoicesCollectionRef();
      if (invoicesRef) {
        const q = query(invoicesRef, orderBy("numeroFactura", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setNextNumeroFactura(1);
        } else {
          const lastFactura = querySnapshot.docs[0].data() as FacturaCompraDocument;
          setNextNumeroFactura((lastFactura.numeroFactura || 0) + 1);
        }
      } else {
         toast({ variant: "destructive", title: "Error", description: "No se pudo obtener la referencia a las facturas." });
         setIsFetchingCompanyProfile(false);
         return;
      }
      
      const loansRef = getPrestamosCollectionRef();
      if(loansRef){
          const loansQuery = query(loansRef, where("estado", "==", "Pendiente"));
          const loansSnapshot = await getDocs(loansQuery);
          const loansList = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrestamoDocument));
          setPendingLoans(loansList);
      }

      setIsFacturaFormOpen(true);
    } catch (error) {
      console.error("Error preparing factura form:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo preparar el formulario de facturación." });
    } finally {
        setIsFetchingCompanyProfile(false);
    }
  };

  const handleSaveFactura = async (formData: FacturaCompraFormData) => {
    const invoicesRef = getPurchaseInvoicesCollectionRef();
    const materialsRef = getMaterialsCollectionRef();
    const prestamosRef = getPrestamosCollectionRef();
    if (!invoicesRef || !materialsRef || !prestamosRef || !user || nextNumeroFactura === null) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la factura. Faltan datos o conexión." });
      return;
    }
    setIsSubmitting(true);
    try {
      const total = calculateTotal();
      const abono = formData.abonoPrestamo || 0;
      const netoPagado = total - abono;

      const facturaData: FacturaCompraDocument = {
        userId: user.uid,
        fecha: formData.fecha, 
        items: currentPurchaseItems,
        totalFactura: total,
        netoPagado: netoPagado,
        abonoPrestamo: abono > 0 ? abono : null,
        prestamoIdAbonado: abono > 0 ? formData.prestamoIdAbonado : null,
        numeroFactura: nextNumeroFactura,
        formaDePago: formData.formaDePago,
        tipoProveedor: formData.tipoProveedor,
        proveedorId: formData.proveedorId || null,
        proveedorNombre: formData.proveedorNombre || null,
        observaciones: formData.observaciones || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const batch = writeBatch(db);
      const newFacturaRef = doc(invoicesRef); 
      batch.set(newFacturaRef, facturaData);
      
      // Update stock for each item in the purchase
      currentPurchaseItems.forEach(item => {
        const materialDocRef = doc(materialsRef, item.materialId);
        batch.update(materialDocRef, { stock: increment(item.peso) });
      });
      
      // Update loan if a payment was made
      if (abono > 0 && formData.prestamoIdAbonado) {
          const loanToUpdate = pendingLoans.find(p => p.id === formData.prestamoIdAbonado);
          if (loanToUpdate) {
              const loanRef = doc(prestamosRef, formData.prestamoIdAbonado);
              const nuevoSaldo = loanToUpdate.saldoPendiente - abono;
              const nuevoAbono = {
                  id: new Date().toISOString(),
                  monto: abono,
                  fecha: Timestamp.fromDate(formData.fecha),
                  observacion: `Abono desde Factura de Compra N° ${nextNumeroFactura}`
              };
              
              batch.update(loanRef, {
                  saldoPendiente: nuevoSaldo,
                  estado: nuevoSaldo <= 0 ? 'Pagado' : 'Pendiente',
                  abonos: arrayUnion(nuevoAbono),
                  updatedAt: serverTimestamp(),
              });
          } else {
              // This should ideally not happen due to form logic, but as a safeguard:
              throw new Error("El préstamo a abonar no fue encontrado. La transacción será cancelada.");
          }
      }

      await batch.commit();

      toast({ title: "Factura Guardada", description: `La factura N° ${nextNumeroFactura} ha sido guardada y el inventario actualizado.` });
      setCurrentPurchaseItems([]);
      setIsFacturaFormOpen(false);
      setNextNumeroFactura(null);
      setPendingLoans([]);

    } catch (error: any) {
      console.error("Error saving factura:", error);
      toast({ variant: "destructive", title: "Error al Guardar Factura", description: error.message || "No se pudo guardar la factura o actualizar el inventario." });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Compra de Materiales</CardTitle>
                    <CardDescription>Por favor, inicie sesión para registrar compras.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Debe iniciar sesión para ver esta página.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (isLoading) {
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
              Registrar Compra de Material
            </CardTitle>
            <CardDescription>
              Añada los materiales comprados y genere una factura. El inventario se actualizará automáticamente.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {currentPurchaseItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Aún no hay materiales en esta compra</h3>
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
                  {currentPurchaseItems.map((item, index) => (
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
                  Total Compra: <span className="text-primary">{formatCurrency(calculateTotal())}</span>
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
          aria-label="Facturar Compra"
          disabled={!user || currentPurchaseItems.length === 0 || isSubmitting || isFetchingCompanyProfile}
        >
          {isFetchingCompanyProfile ? <span className="animate-spin h-8 w-8 border-2 border-background rounded-full border-t-transparent"></span> : <FileText className="h-8 w-8" />}
        </Button>
        <Button
          className="h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
          size="icon"
          onClick={() => handleOpenAddItemForm()}
          aria-label="Agregar nuevo material a la compra"
          disabled={!user || isLoading || availableMaterials.length === 0}
        >
          <Plus className="h-8 w-8" />
        </Button>
      </div>

      {availableMaterials.length > 0 && (
        <CompraMaterialItemForm
          isOpen={isAddItemFormOpen}
          setIsOpen={setIsAddItemFormOpen}
          onSubmit={handleAddItemToPurchase}
          materials={availableMaterials}
          defaultValues={editingItem ? { materialId: editingItem.materialId, peso: editingItem.peso } : undefined}
          isLoading={isSubmitting} 
          title={editingItem ? "Editar Ítem de Compra" : "Agregar Ítem a la Compra"}
        />
      )}
      {availableMaterials.length === 0 && isAddItemFormOpen && (
          <AlertDialog open={isAddItemFormOpen} onOpenChange={setIsAddItemFormOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>No hay materiales disponibles</AlertDialogTitle>
                <AlertDialogDescription>
                  Primero debe registrar materiales en la sección "Gestión de Material {'>'} Materiales" antes de poder agregarlos a una compra.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsAddItemFormOpen(false)}>Entendido</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      )}

      {isFacturaFormOpen && companyProfileData && nextNumeroFactura !== null && (
        <FacturaCompraForm
            isOpen={isFacturaFormOpen}
            setIsOpen={setIsFacturaFormOpen}
            onSubmit={handleSaveFactura}
            isLoading={isSubmitting}
            compraItems={currentPurchaseItems}
            totalCompra={calculateTotal()}
            nextNumeroFactura={nextNumeroFactura}
            companyProfile={companyProfileData}
            userEmail={user?.email || null}
            asociados={availableAsociados}
            pendingLoans={pendingLoans}
        />
      )}


      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ítem de la compra?</AlertDialogTitle>
            <AlertDialogDescription>
              El ítem "{itemToDelete?.materialName}" será eliminado de la lista de compra actual. Esta acción no se puede deshacer para esta sesión de compra.
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
