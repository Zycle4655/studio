
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, getDocs, query, orderBy, writeBatch, increment } from "firebase/firestore";
import type { FacturaCompraDocument, CompraMaterialItem, FacturaCompraFormData } from "@/schemas/compra";
import type { CompanyProfileDocument } from "@/schemas/company";
import type { MaterialDocument } from "@/schemas/material";
import type { AsociadoDocument } from "@/schemas/sui";
import { FacturaCompraFormSchema } from "@/schemas/compra";
import { useToast } from "@/hooks/use-toast";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Save, XCircle, UserSquare, ListOrdered, FileEdit, DollarSign, Info, Printer, Trash2, PlusCircle, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
import CompraMaterialItemForm from "@/components/forms/CompraMaterialItemForm";
import type { CompraMaterialItemFormData } from "@/schemas/compra";


export default function EditFacturaCompraPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const facturaId = params.facturaId as string;

  const [invoice, setInvoice] = React.useState<FacturaCompraDocument | null>(null);
  const [editableItems, setEditableItems] = React.useState<CompraMaterialItem[]>([]);
  const [currentTotalFactura, setCurrentTotalFactura] = React.useState(0);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfileDocument | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
  const [isSavingInvoice, setIsSavingInvoice] = React.useState(false);

  const [availableMaterials, setAvailableMaterials] = React.useState<MaterialDocument[]>([]);
  const [availableAsociados, setAvailableAsociados] = React.useState<AsociadoDocument[]>([]);
  const [isItemFormOpen, setIsItemFormOpen] = React.useState(false);
  const [isFetchingData, setIsFetchingData] = React.useState(false);

  const [itemToDeleteIndex, setItemToDeleteIndex] = React.useState<number | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);


  const form = useForm<FacturaCompraFormData>({
    resolver: zodResolver(FacturaCompraFormSchema),
    defaultValues: {
      fecha: new Date(),
      tipoProveedor: "general",
      proveedorId: null,
      proveedorNombre: "",
      formaDePago: undefined,
      observaciones: "",
    },
  });

  const tipoProveedor = form.watch("tipoProveedor");

   React.useEffect(() => {
    // Reset provider fields when type changes
    if (form.formState.isDirty) { // only reset if user interacts with the form
      form.setValue("proveedorId", null);
      form.setValue("proveedorNombre", "");
    }
  }, [tipoProveedor, form]);


  const getMaterialsCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "materials");
  }, [user]);
  
  const getAsociadosCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "asociados");
  }, [user]);


  React.useEffect(() => {
    if (!user || !facturaId) {
      setIsLoadingPage(false);
      if (!user) router.replace("/login");
      return;
    }

    const fetchInvoiceData = async () => {
      setIsLoadingPage(true);
      setIsFetchingData(true);
      try {
        const invoiceRef = doc(db, "companyProfiles", user.uid, "purchaseInvoices", facturaId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data() as FacturaCompraDocument;
          setInvoice(data);
          setEditableItems(JSON.parse(JSON.stringify(data.items))); 
          setCurrentTotalFactura(data.totalFactura);
          form.reset({
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : new Date(data.fecha),
            tipoProveedor: data.tipoProveedor || 'general',
            proveedorId: data.proveedorId || null,
            proveedorNombre: data.proveedorNombre || "",
            formaDePago: data.formaDePago,
            observaciones: data.observaciones || "",
          });
        } else {
          toast({ variant: "destructive", title: "Error", description: "Factura no encontrada." });
          router.replace("/dashboard/gestion-material/facturas-compra");
        }

        const profileRef = doc(db, "companyProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        }
        setUserEmail(user.email);
        
        // Fetch materials and aociados
        const materialsCollectionRef = getMaterialsCollectionRef();
        const asociadosCollectionRef = getAsociadosCollectionRef();
        
        if(materialsCollectionRef) {
            const matQuerySnapshot = await getDocs(query(materialsCollectionRef, orderBy("name", "asc")));
            const materialsList = matQuerySnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as MaterialDocument)
            );
            setAvailableMaterials(materialsList);
        }
        if(asociadosCollectionRef) {
            const asocQuerySnapshot = await getDocs(query(asociadosCollectionRef, orderBy("nombre", "asc")));
            const asociadosList = asocQuerySnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as AsociadoDocument)
            );
            setAvailableAsociados(asociadosList);
        }


      } catch (error) {
        console.error("Error fetching invoice or related data for edit:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos para editar." });
      } finally {
        setIsLoadingPage(false);
        setIsFetchingData(false);
      }
    };

    fetchInvoiceData();
  }, [user, facturaId, router, toast, form, getMaterialsCollectionRef, getAsociadosCollectionRef]);

  const calculateTotal = React.useCallback((items: CompraMaterialItem[]) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, []);

  React.useEffect(() => {
    setCurrentTotalFactura(calculateTotal(editableItems));
  }, [editableItems, calculateTotal]);


  const handleItemFieldChange = (index: number, field: keyof CompraMaterialItem, value: string | number) => {
    const newItems = [...editableItems];
    const itemToUpdate = { ...newItems[index] };

    if (field === "peso" || field === "precioUnitario") {
      const numericValue = typeof value === 'string' ? parseFloat(value.replace(",", ".")) : value; 
      if (isNaN(numericValue) || numericValue < 0) {
        if (field === "peso" && numericValue < 0) return;
        if (field === "precioUnitario" && numericValue < 0) return;
      } else {
         itemToUpdate[field] = numericValue;
      }
    }
    
    itemToUpdate.subtotal = (itemToUpdate.peso || 0) * (itemToUpdate.precioUnitario || 0);
    newItems[index] = itemToUpdate;
    setEditableItems(newItems);
  };

  const handleOpenDeleteItemDialog = (index: number) => {
    setItemToDeleteIndex(index);
    setItemToDeleteName(editableItems[index]?.materialName || "este ítem");
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteItem = () => {
    if (itemToDeleteIndex === null) return;
    const itemNameToDelete = editableItems[itemToDeleteIndex]?.materialName;
    const updatedItems = editableItems.filter((_, i) => i !== itemToDeleteIndex);
    setEditableItems(updatedItems);
    toast({ title: "Ítem Eliminado", description: `El ítem "${itemNameToDelete}" ha sido eliminado de la factura.` });
    setIsDeleteDialogOpen(false);
    setItemToDeleteIndex(null);
    setItemToDeleteName(null);
  };

  const handleOpenAddItemForm = () => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debe iniciar sesión para agregar ítems." });
        return;
    }
    if (availableMaterials.length === 0 && !isFetchingData) {
       toast({ variant: "destructive", title: "Sin Materiales", description: "No hay materiales registrados para agregar. Regístrelos primero en 'Gestión de Material > Materiales'." });
       return;
    }
    setIsItemFormOpen(true);
  };

  const handleAddNewItemToInvoice = (data: CompraMaterialItemFormData) => {
    const selectedMaterial = availableMaterials.find(m => m.id === data.materialId);
    if (!selectedMaterial) {
      toast({ variant: "destructive", title: "Error", description: "Material no encontrado." });
      return;
    }

    const precioUnitarioFinal = data.precioUnitario ?? selectedMaterial.price;

    const newItem: CompraMaterialItem = {
      id: Date.now().toString(),
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialCode: selectedMaterial.code || null,
      peso: data.peso,
      precioUnitario: precioUnitarioFinal,
      subtotal: data.peso * precioUnitarioFinal,
    };

    setEditableItems(prevItems => [...prevItems, newItem]);
    toast({ title: "Ítem Agregado", description: `${newItem.materialName} agregado a la factura.` });
    setIsItemFormOpen(false);
  };


  const handleUpdateInvoice = async (formData: FacturaCompraFormData) => {
    if (!user || !invoice || !facturaId || !db) return;
    setIsSavingInvoice(true);
    
    const materialsRef = getMaterialsCollectionRef();
    if (!materialsRef) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo obtener la referencia a los materiales." });
        setIsSavingInvoice(false);
        return;
    }

    try {
      const invoiceRef = doc(db, "companyProfiles", user.uid, "purchaseInvoices", facturaId);
      const finalTotalFactura = calculateTotal(editableItems);

      for (const item of editableItems) {
        if (!item.peso || item.peso <= 0) {
          toast({ variant: "destructive", title: "Error en Ítem", description: `El peso del material "${item.materialName}" debe ser mayor a cero.` });
          setIsSavingInvoice(false);
          return;
        }
        if (!item.precioUnitario || item.precioUnitario <= 0) {
          toast({ variant: "destructive", title: "Error en Ítem", description: `El precio unitario del material "${item.materialName}" debe ser mayor a cero.` });
          setIsSavingInvoice(false);
          return;
        }
      }
      
      const batch = writeBatch(db);

      const stockAdjustments = new Map<string, number>();
      invoice.items.forEach(item => {
        const currentChange = stockAdjustments.get(item.materialId) || 0;
        stockAdjustments.set(item.materialId, currentChange - item.peso);
      });
      editableItems.forEach(item => {
        const currentChange = stockAdjustments.get(item.materialId) || 0;
        stockAdjustments.set(item.materialId, currentChange + item.peso);
      });
      stockAdjustments.forEach((change, materialId) => {
        if (change !== 0) {
          const materialDocRef = doc(materialsRef, materialId);
          batch.update(materialDocRef, { stock: increment(change) });
        }
      });
      
      const updatedData: Partial<FacturaCompraDocument> = {
        fecha: Timestamp.fromDate(formData.fecha),
        tipoProveedor: formData.tipoProveedor,
        proveedorId: formData.proveedorId || null,
        proveedorNombre: formData.proveedorNombre || null,
        formaDePago: formData.formaDePago,
        observaciones: formData.observaciones || null,
        items: editableItems,
        totalFactura: finalTotalFactura,
        updatedAt: serverTimestamp(),
      };
      
      batch.update(invoiceRef, updatedData);
      
      await batch.commit();

      toast({ title: "Factura Actualizada", description: "Los detalles de la factura y el inventario han sido actualizados." });
      router.push("/dashboard/gestion-material/facturas-compra");

    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la factura o el inventario." });
    } finally {
      setIsSavingInvoice(false);
    }
  };
  
  const triggerSaveInvoice = async () => {
    const isValid = await form.trigger();
    if (isValid) {
        if (editableItems.length === 0) {
            toast({ variant: "destructive", title: "Factura Vacía", description: "La factura debe tener al menos un ítem." });
            return;
        }
        handleUpdateInvoice(form.getValues());
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateWithTimeForDisplay = (dateValue: Timestamp | Date | undefined): string => {
    if (!dateValue) return "N/A";
    const date = dateValue instanceof Timestamp ? dateValue.toDate() : dateValue;
    return format(date, "PPPp", { locale: es }); 
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-edit-preview-content");
    if (previewElement && invoice && companyProfile) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura Compra N° '+ invoice.numeroFactura +'</title>');
      
      const stylesHtml = `
        <style>
          body { font-family: 'Arial', sans-serif; margin: 5px; color: #000; background-color: #fff; font-size: 10px; max-width: 280px; padding: 0; }
          .invoice-header { text-align: center; margin-bottom: 8px; }
          .invoice-header img { max-height: 40px; margin-bottom: 5px; object-fit: contain; }
          .invoice-header h1 { margin: 0; font-size: 1.1em; font-weight: bold; }
          .invoice-header p { margin: 1px 0; font-size: 0.8em; }
          .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 3px; font-size: 0.9em; text-align: center; border-top: 1px dashed #555; border-bottom: 1px dashed #555; padding: 2px 0;}
          .invoice-info { margin-bottom: 8px; font-size: 0.85em;}
          .invoice-info p { margin: 2px 0; display: flex; justify-content: space-between; }
          .invoice-info p span:first-child { font-weight: bold; margin-right: 5px;}
          .user-details p { margin: 2px 0; font-size: 0.85em; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 0.85em; }
          .items-table th, .items-table td { border-bottom: 1px solid #eee; padding: 3px 1px; text-align: left; }
          .items-table th { font-weight: bold; background-color: transparent; }
          .items-table .text-right { text-align: right !important; }
          .items-table .col-material { width: 45%; }
          .items-table .col-peso, .items-table .col-vunit, .items-table .col-subtotal { width: 18.33%; }
          .total-section { margin-top: 10px; text-align: right; font-size: 1em; }
          .total-section p { margin: 3px 0; font-weight: bold; }
          .total-section .total-amount { font-size: 1.1em; }
          .payment-method { font-size: 0.85em; margin-top: 5px; text-align: left; }
          .footer-notes { margin-top: 10px; font-size: 0.75em; border-top: 1px solid #eee; padding-top: 5px; text-align: center; }
          @media print { body { margin: 0; padding:0; max-width: 100%; } .items-table th, .items-table td { font-size: 0.8em; padding: 2px 1px;} .invoice-header h1 { font-size: 1em; } .section-title { font-size: 0.85em; } }
        </style>`;
      printWindow.document.write(stylesHtml);
      printWindow.document.write('</head><body>');
      
      let printHtml = '<div class="invoice-header">';
      if (companyProfile?.logoUrl) {
        printHtml += `<img src="${companyProfile.logoUrl}" alt="Logo de ${companyProfile.companyName}" style="max-height: 40px; margin-bottom: 5px; object-fit: contain; display: block; margin-left: auto; margin-right: auto;" data-ai-hint="logo company" />`;
      }
      printHtml += `<h1>${companyProfile?.companyName || "Nombre Empresa"}</h1>`;
      if (companyProfile?.nit) printHtml += `<p>NIT: ${companyProfile.nit}</p>`;
      if (companyProfile?.address) printHtml += `<p>${companyProfile.address}</p>`;
      if (companyProfile?.phone) printHtml += `<p>Tel: ${companyProfile.phone}</p>`;
      if (userEmail) printHtml += `<p>Email: ${userEmail}</p>`;
      printHtml += '</div>';

      printHtml += '<div class="invoice-info">';
      printHtml += `<p><span>Factura N°:</span> <span style="font-weight: bold;">${invoice.numeroFactura}</span></p>`;
      printHtml += `<p><span>Fecha y Hora:</span> <span>${formatDateWithTimeForDisplay(form.watch("fecha"))}</span></p>`;
      printHtml += '</div>';

      const watchedUsuarioNombre = form.watch("proveedorNombre");
      if (watchedUsuarioNombre) {
        printHtml += '<div class="section-title">Usuario</div>';
        printHtml += `<div class="user-details"><p>${watchedUsuarioNombre}</p></div>`;
      }

      printHtml += '<div class="section-title">Detalle de la Compra</div>';
      printHtml += '<table class="items-table"><thead><tr><th class="col-material">Material</th><th class="col-peso text-right">Peso</th><th class="col-vunit text-right">Vr. Unit.</th><th class="col-subtotal text-right">Subtotal</th></tr></thead><tbody>';
      editableItems.forEach(item => {
        printHtml += `<tr><td class="col-material">${item.materialName}${item.materialCode ? ` (${item.materialCode})` : ''}</td><td class="col-peso text-right">${item.peso.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td><td class="col-vunit text-right">${formatCurrency(item.precioUnitario)}</td><td class="col-subtotal text-right">${formatCurrency(item.subtotal)}</td></tr>`;
      });
      printHtml += '</tbody></table>';
      
      printHtml += `<div class="total-section"><p>TOTAL FACTURA: <span class="total-amount">${formatCurrency(currentTotalFactura)}</span></p></div>`;
      
      const watchedFormaDePago = form.watch("formaDePago");
      if (watchedFormaDePago) {
          printHtml += `<p class="payment-method"><strong>Forma de Pago:</strong> <span style="text-transform: capitalize;">${watchedFormaDePago}</span></p>`;
      }

      const watchedObservaciones = form.watch("observaciones");
      if (watchedObservaciones) {
        printHtml += `<div class="footer-notes"><p><strong>Observaciones:</strong> ${watchedObservaciones}</p></div>`;
      }
      
      printWindow.document.write(printHtml);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 250);
    } else {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo generar la vista previa. Datos incompletos."})
    }
  };


  if (isLoadingPage) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-5 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
            <div className="mt-8 pt-6 border-t">
                <Skeleton className="h-6 w-1/4 mb-3"/>
                <Skeleton className="h-10 w-full rounded-md mb-2"/>
                <Skeleton className="h-10 w-full rounded-md mb-2"/>
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
        <div className="container py-8 px-4 md:px-6 text-center">
            <p>Factura no encontrada o error al cargar.</p>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <FileEdit className="mr-3 h-7 w-7" />
            Editar Factura de Compra N° {invoice.numeroFactura}
          </CardTitle>
          <CardDescription>
            Modifique los detalles y los ítems de la factura. El inventario se ajustará automáticamente al guardar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-5">
                  <div>
                      <FormLabel className="text-foreground/80">Número de Factura</FormLabel>
                      <Input value={invoice.numeroFactura} readOnly disabled className="mt-1 bg-muted/50 font-semibold" />
                  </div>
                  <FormField
                    control={form.control}
                    name="fecha"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-foreground/80">Fecha y Hora de Factura</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  formatDateWithTimeForDisplay(field.value)
                                ) : (
                                  <span>Seleccione una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) {
                                    const now = new Date();
                                    date.setHours(field.value?.getHours() || now.getHours());
                                    date.setMinutes(field.value?.getMinutes() || now.getMinutes());
                                    date.setSeconds(field.value?.getSeconds() || now.getSeconds());
                                }
                                field.onChange(date);
                               }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 <FormField
                    control={form.control}
                    name="tipoProveedor"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Tipo de Proveedor</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="general" />
                                </FormControl>
                                <FormLabel className="font-normal">General</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="asociado" />
                                </FormControl>
                                <FormLabel className="font-normal">Asociado</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 {tipoProveedor === 'general' ? (
                  <FormField
                    control={form.control}
                    name="proveedorNombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Nombre del Proveedor (Opcional)</FormLabel>
                        <div className="relative">
                          <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ""} className="pl-10" />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  ) : (
                  <FormField
                    control={form.control}
                    name="proveedorId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Asociado</FormLabel>
                        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {form.watch("proveedorNombre") || "Seleccione un asociado"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar asociado..." />
                              <CommandList>
                                <CommandEmpty>No se encontró el asociado.</CommandEmpty>
                                <CommandGroup>
                                  {availableAsociados.map((asociado) => (
                                    <CommandItem
                                      value={asociado.nombre}
                                      key={asociado.id}
                                      onSelect={() => {
                                        form.setValue("proveedorId", asociado.id)
                                        form.setValue("proveedorNombre", asociado.nombre)
                                        setIsComboboxOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          asociado.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {asociado.nombre}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                  <FormField
                    control={form.control}
                    name="formaDePago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Forma de Pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione forma de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="nequi">Nequi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Observaciones (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Añada notas o comentarios..."
                            className="resize-none"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-l md:pl-8 pt-2 md:pt-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-primary flex items-center">
                            <Info size={18} className="mr-2"/> Vista Previa
                        </h3>
                        <Button type="button" variant="outline" size="sm" onClick={printFacturaPreview} disabled={!invoice || !companyProfile}>
                            <Printer size={16} className="mr-2"/> Imprimir Factura
                        </Button>
                    </div>
                     <div id="factura-edit-preview-content" className="p-1 border rounded-md bg-background text-xs max-h-[50vh] overflow-y-auto hidden">
                     </div>
                     <div className="p-4 border rounded-md bg-background text-sm max-h-[50vh] overflow-y-auto">
                        <div className="invoice-header text-center mb-4">
                            {companyProfile?.logoUrl && (
                                <Image
                                    src={companyProfile.logoUrl}
                                    alt={`Logo de ${companyProfile.companyName}`}
                                    width={60} height={40}
                                    className="mx-auto mb-2 object-contain"
                                    data-ai-hint="logo company"
                                />
                            )}
                            <h1 className="text-lg font-bold">{companyProfile?.companyName || "Nombre Empresa"}</h1>
                            {companyProfile?.nit && <p className="text-xs">NIT: {companyProfile.nit}</p>}
                            {companyProfile?.address && <p className="text-xs">{companyProfile.address}</p>}
                            {companyProfile?.phone && <p className="text-xs">Tel: {companyProfile.phone}</p>}
                            {userEmail && <p className="text-xs">Email: {userEmail}</p>}
                        </div>
                        
                        <div className="invoice-info my-2 text-xs">
                            <p><strong>Factura N°:</strong> <span className="font-semibold float-right">{invoice.numeroFactura}</span></p>
                            <p><strong>Fecha y Hora:</strong> <span className="float-right">{formatDateWithTimeForDisplay(form.watch("fecha"))}</span></p>
                        </div>
                        
                        {form.watch("proveedorNombre") && (
                            <>
                            <div className="section-title text-center font-bold my-2 text-xs">Usuario</div>
                            <div className="user-details my-1 text-center text-xs">
                                <p>{form.watch("proveedorNombre")}</p>
                            </div>
                            </>
                        )}

                         <div className="section-title text-center font-bold my-2 text-xs">Detalle de la Compra</div>
                         <table className="items-table w-full my-1 text-xs">
                            <thead><tr><th className="font-bold">Material</th><th className="text-right font-bold">Peso</th><th className="text-right font-bold">Vr. Unit.</th><th className="text-right font-bold">Subtotal</th></tr></thead>
                            <tbody>
                            {editableItems.map((item, idx) => (
                                <tr key={item.id || idx}>
                                <td>{item.materialName} {item.materialCode && `(${item.materialCode})`}</td>
                                <td className="text-right">{item.peso.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="text-right">{formatCurrency(item.precioUnitario)}</td>
                                <td className="text-right">{formatCurrency(item.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                         </table>

                        <div className="total-section mt-4 text-right font-bold"><p>TOTAL FACTURA: <span>{formatCurrency(currentTotalFactura)}</span></p></div>
                        
                        {form.watch("formaDePago") && <p className="payment-method mt-1 text-xs"><strong>Forma de Pago:</strong> <span className="capitalize float-right">{form.watch("formaDePago")}</span></p>}
                        
                        {form.watch("observaciones") && <div className="footer-notes mt-2 pt-1 border-t text-xs"><p><strong>Observaciones:</strong> {form.watch("observaciones")}</p></div>}
                    </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-primary flex items-center">
                    <ListOrdered className="mr-2 h-5 w-5" />
                    Ítems de la Factura
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAddItemForm}
                      disabled={isSavingInvoice || isFetchingData || availableMaterials.length === 0}
                    >
                      <PlusCircle className="mr-2 h-4 w-4"/>
                      Agregar Ítem
                    </Button>
                </div>
                {editableItems.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="text-right w-32">Peso (kg)</TableHead>
                          <TableHead className="text-right w-40">Precio Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right w-[70px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editableItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{item.materialName}</TableCell>
                            <TableCell>{item.materialCode || "N/A"}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={String(item.peso ?? "")}
                                onChange={(e) => handleItemFieldChange(index, "peso", e.target.value)}
                                className="h-8 text-right"
                                step="0.01"
                                min="0.01"
                                disabled={isSavingInvoice}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={String(item.precioUnitario ?? "")}
                                onChange={(e) => handleItemFieldChange(index, "precioUnitario", e.target.value)}
                                className="h-8 text-right"
                                step="0.01"
                                min="0.01"
                                disabled={isSavingInvoice}
                              />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                            <TableCell className="text-right">
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenDeleteItemDialog(index)} disabled={isSavingInvoice} aria-label="Eliminar ítem" className="hover:text-destructive">
                                <Trash2 className="h-4 w-4"/>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Esta factura no tiene ítems. Agregue al menos uno.</p>
                )}
              </div>

              <CardFooter className="pt-8 flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSavingInvoice}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="button" onClick={triggerSaveInvoice} disabled={isSavingInvoice || isLoadingPage || editableItems.length === 0}>
                  {isSavingInvoice ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
                </Button>
              </CardFooter>
            </form>
          </FormProvider>
        </CardContent>
      </Card>

      {isItemFormOpen && availableMaterials.length > 0 && (
        <CompraMaterialItemForm
            isOpen={isItemFormOpen}
            setIsOpen={setIsItemFormOpen}
            onSubmit={handleAddNewItemToInvoice}
            materials={availableMaterials}
            isLoading={isSavingInvoice || isFetchingData}
            title="Agregar Nuevo Ítem a la Factura"
            isEditingInvoiceItem={false}
        />
      )}
       {isItemFormOpen && availableMaterials.length === 0 && !isFetchingData && (
          <AlertDialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>No hay materiales disponibles</AlertDialogTitle>
                <AlertDialogDescription>
                  No hay materiales registrados en el sistema para agregar a la factura.
                  Vaya a 'Gestión de Material {'>'} Materiales' para crearlos primero.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsItemFormOpen(false)}>Entendido</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      )}


      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              El ítem "{itemToDeleteName}" será eliminado de la factura. Esta acción es irreversible una vez guardados los cambios en la factura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleConfirmDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Ítem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    