
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
import type { FacturaCompraDocument, CompraMaterialItem, FacturaCompraFormData } from "@/schemas/compra";
import type { CompanyProfileDocument } from "@/schemas/company";
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
import { CalendarIcon, Save, XCircle, UserSquare, ListOrdered, FileEdit, DollarSign, Info, Printer, Trash2 } from "lucide-react";
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

  // For item deletion confirmation
  const [itemToDeleteIndex, setItemToDeleteIndex] = React.useState<number | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);


  const form = useForm<FacturaCompraFormData>({
    resolver: zodResolver(FacturaCompraFormSchema),
    defaultValues: {
      fecha: new Date(),
      proveedorNombre: "",
      formaDePago: undefined,
      observaciones: "",
    },
  });

  React.useEffect(() => {
    if (!user || !facturaId) {
      setIsLoadingPage(false);
      if (!user) router.replace("/login");
      return;
    }

    setIsLoadingPage(true);
    const fetchInvoiceData = async () => {
      try {
        const invoiceRef = doc(db, "companyProfiles", user.uid, "purchaseInvoices", facturaId);
        const invoiceSnap = await getDoc(invoiceRef);

        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data() as FacturaCompraDocument;
          setInvoice(data);
          // Deep copy items to allow local modifications without directly mutating Firestore data
          setEditableItems(JSON.parse(JSON.stringify(data.items))); 
          setCurrentTotalFactura(data.totalFactura);
          form.reset({
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : new Date(data.fecha),
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

      } catch (error) {
        console.error("Error fetching invoice or profile for edit:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos para editar." });
      } finally {
        setIsLoadingPage(false);
      }
    };

    fetchInvoiceData();
  }, [user, facturaId, router, toast, form]);

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
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numericValue) || numericValue < 0) {
        // Potentially show a toast or inline error for invalid input
        // For now, we just don't update if it's not a valid positive number for these fields
        // Or, allow 0 temporarily for peso, but subtotal will be 0
        if (field === "peso" && numericValue < 0) return;
        if (field === "precioUnitario" && numericValue < 0) return;
        // itemToUpdate[field] = 0; // or keep old value
      } else {
         itemToUpdate[field] = numericValue;
      }
    }
    
    // Recalculate subtotal
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


  const handleUpdateInvoice = async (formData: FacturaCompraFormData) => {
    if (!user || !invoice || !facturaId) return;
    setIsSavingInvoice(true);
    try {
      const invoiceRef = doc(db, "companyProfiles", user.uid, "purchaseInvoices", facturaId);
      const finalTotalFactura = calculateTotal(editableItems);

      // Validate items before saving
      for (const item of editableItems) {
        if (item.peso <= 0) {
          toast({ variant: "destructive", title: "Error en Ítem", description: `El peso del material "${item.materialName}" debe ser mayor a cero.` });
          setIsSavingInvoice(false);
          return;
        }
        if (item.precioUnitario <= 0) {
          toast({ variant: "destructive", title: "Error en Ítem", description: `El precio unitario del material "${item.materialName}" debe ser mayor a cero.` });
          setIsSavingInvoice(false);
          return;
        }
      }

      const updatedData: Partial<FacturaCompraDocument> = {
        fecha: Timestamp.fromDate(formData.fecha),
        proveedorNombre: formData.proveedorNombre || null,
        formaDePago: formData.formaDePago,
        observaciones: formData.observaciones || null,
        items: editableItems, // Save the locally modified items
        totalFactura: finalTotalFactura,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(invoiceRef, updatedData);
      toast({ title: "Factura Actualizada", description: "Los detalles de la factura han sido actualizados." });
      router.push("/dashboard/gestion-material/facturas-compra");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la factura." });
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
        handleUpdateInvoice(form.getValues() as FacturaCompraFormData);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateForDisplay = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "PPP", { locale: es });
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-edit-preview-content");
    if (previewElement && invoice && companyProfile) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura de Compra N° '+ invoice.numeroFactura +'</title>');
      const stylesHtml = '' +
        '<style>' +
        'body { font-family: sans-serif; margin: 20px; color: #333; }' +
        '.invoice-header { text-align: center; margin-bottom: 20px; }' +
        '.invoice-header img { max-height: 60px; margin-bottom: 10px; object-fit: contain; }' +
        '.invoice-header h1 { margin: 0; font-size: 1.6em; color: #005A9C; }' +
        '.invoice-header p { margin: 2px 0; font-size: 0.9em; }' +
        '.section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #005A9C; font-size: 1em; text-transform: uppercase; }' +
        '.invoice-details, .provider-details { margin-bottom: 15px; font-size: 0.9em;}' +
        '.invoice-details p, .provider-details p { margin: 3px 0; }' +
        '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em; }' +
        '.items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }' +
        '.items-table th { background-color: #f0f0f0; font-weight: bold; }' +
        '.text-right { text-align: right !important; }' +
        '.total-section { margin-top: 20px; text-align: right; font-size: 1em; }' +
        '.total-section p { margin: 5px 0; font-weight: bold; }' +
        '.total-section .total-amount { color: #005A9C; font-size: 1.2em;}' +
        '.footer-notes { margin-top: 30px; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 10px; }' +
        '.signature-area { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; }' +
        '.signature-block { width: 45%; text-align: center;}' +
        '.signature-line { display: inline-block; width: 200px; border-bottom: 1px solid #333; margin-top: 40px; }' +
        '.grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }' +
        '@media print { body { margin: 0; } .no-print { display: none !important; } .items-table th, .items-table td { font-size: 0.85em; padding: 6px;} .invoice-header h1 { font-size: 1.5em; } .section-title { font-size: 0.95em; } }' +
        '</style>';
      printWindow.document.write(stylesHtml);
      printWindow.document.write('</head><body>');
      printWindow.document.write(previewElement.innerHTML);
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
            Modifique los detalles y los ítems de la factura. La adición de nuevos ítems a una factura existente estará disponible próximamente.
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
                        <FormLabel className="text-foreground/80">Fecha de Factura</FormLabel>
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
                                  format(field.value, "PPP", { locale: es })
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
                              onSelect={field.onChange}
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
                     <div id="factura-edit-preview-content" className="p-3 border rounded-md bg-card/50 text-sm max-h-[50vh] overflow-y-auto">
                        <div className="invoice-header">
                            {companyProfile?.logoUrl && (
                                <Image
                                    src={companyProfile.logoUrl}
                                    alt={`Logo de ${companyProfile.companyName}`}
                                    width={80} height={60}
                                    className="mx-auto mb-2 object-contain"
                                    data-ai-hint="logo company"
                                />
                            )}
                            <h1 className="text-xl font-bold text-primary">{companyProfile?.companyName || "Nombre Empresa"}</h1>
                            {companyProfile?.nit && <p>NIT: {companyProfile.nit}</p>}
                            {companyProfile?.address && <p>{companyProfile.address}</p>}
                            {companyProfile?.phone && <p>Tel: {companyProfile.phone}</p>}
                            {userEmail && <p>Email: {userEmail}</p>}
                        </div>
                        <div className="section-title mt-4">Información de la Factura</div>
                        <div className="invoice-details grid-2-cols my-2">
                            <div><p><strong>N° Factura:</strong> <span className="text-primary font-semibold">{invoice.numeroFactura}</span></p></div>
                            <div className="text-right"><p><strong>Fecha:</strong> {formatDateForDisplay(form.watch("fecha"))}</p></div>
                        </div>
                        {form.watch("proveedorNombre") && (
                            <>
                            <div className="section-title">Información del Proveedor</div>
                            <div className="provider-details my-2">
                                <p><strong>Nombre:</strong> {form.watch("proveedorNombre")}</p>
                            </div>
                            </>
                        )}
                         <div className="section-title">Detalle de la Compra</div>
                         <Table className="items-table w-full text-xs my-2">
                            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right">Vr. Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {editableItems.map((item, idx) => (
                                <TableRow key={item.id || idx}>
                                <TableCell>{item.materialName}</TableCell>
                                <TableCell className="text-right">{item.peso.toLocaleString('es-CO')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.precioUnitario)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                         </Table>
                        <div className="total-section mt-4"><p>TOTAL FACTURA: <span className="total-amount">{formatCurrency(currentTotalFactura)}</span></p></div>
                        {form.watch("formaDePago") && <p className="mt-2 text-xs"><strong>Forma de Pago:</strong> <span className="capitalize">{form.watch("formaDePago")}</span></p>}
                        {form.watch("observaciones") && <div className="footer-notes mt-3 pt-2 border-t"><p className="text-xs"><strong>Observaciones:</strong> {form.watch("observaciones")}</p></div>}
                        <div className="signature-area"><div className="signature-block"><p>Firma Proveedor:</p><div className="signature-line"></div></div><div className="signature-block"><p>Firma Recibido (Empresa):</p><div className="signature-line"></div></div></div>
                    </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-primary flex items-center">
                    <ListOrdered className="mr-2 h-5 w-5" />
                    Ítems de la Factura
                    </h3>
                    {/* Botón para agregar ítem eliminado por ahora */}
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
                                value={item.peso}
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
                                value={item.precioUnitario}
                                onChange={(e) => handleItemFieldChange(index, "precioUnitario", e.target.value)}
                                className="h-8 text-right"
                                step="0.01"
                                min="0.01"
                                disabled={isSavingInvoice}
                              />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteItemDialog(index)} disabled={isSavingInvoice} aria-label="Eliminar ítem" className="hover:text-destructive">
                                <Trash2 className="h-4 w-4"/>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Esta factura no tiene ítems. Debería tener al menos uno para ser válida.</p>
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

    