
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FacturaVentaFormSchema, type FacturaVentaFormData, type VentaMaterialItem } from "@/schemas/venta";
import type { CompanyProfileDocument } from "@/schemas/company";
import { Save, XCircle, CalendarIcon, FileText, UserSquare, Printer, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";

interface FacturaVentaFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: FacturaVentaFormData) => Promise<void>;
  isLoading?: boolean;
  ventaItems: VentaMaterialItem[];
  totalVenta: number;
  nextNumeroFactura: number | null;
  companyProfile: CompanyProfileDocument | null;
  userEmail: string | null;
}

export default function FacturaVentaForm({
  isOpen,
  setIsOpen,
  onSubmit,
  isLoading = false,
  ventaItems,
  totalVenta,
  nextNumeroFactura,
  companyProfile,
  userEmail,
}: FacturaVentaFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientSuggestions, setClientSuggestions] = React.useState<string[]>([]);
  
  const form = useForm<FacturaVentaFormData>({
    resolver: zodResolver(FacturaVentaFormSchema),
    defaultValues: {
      fecha: new Date(),
      formaDePago: "efectivo",
      clienteNombre: "",
      observaciones: "",
    },
  });

  React.useEffect(() => {
    if (!user || !db || !isOpen) return;

    const fetchSuggestions = async () => {
      try {
        const invoicesRef = collection(db, "companyProfiles", user.uid, "saleInvoices");
        const q = query(invoicesRef);
        const querySnapshot = await getDocs(q);
        const names = new Set<string>();
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.clienteNombre) {
            names.add(data.clienteNombre);
          }
        });
        setClientSuggestions(Array.from(names));
      } catch (error) {
        console.error("Error fetching client suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [user, isOpen]);


  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        fecha: new Date(),
        formaDePago: "efectivo",
        clienteNombre: "",
        observaciones: "",
      });
    }
  }, [isOpen, form]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateWithTimeForDisplay = (dateValue: Date | undefined): string => {
    if (!dateValue) return "N/A";
    return format(dateValue, "PPPp", { locale: es }); 
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-create-preview-content");
    if (previewElement && companyProfile && nextNumeroFactura !== null) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura Venta N° '+ nextNumeroFactura +'</title>');
      const stylesHtml = `
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 5px; 
            color: #000; 
            background-color: #fff;
            font-size: 10px;
            max-width: 280px; 
            padding: 0;
          }
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
          .no-print { display: none !important; }
          @media print { 
            body { margin: 0; padding:0; max-width: 100%; } 
            .no-print { display: none !important; } 
            .items-table th, .items-table td { font-size: 0.8em; padding: 2px 1px;} 
            .invoice-header h1 { font-size: 1em; } 
            .section-title { font-size: 0.85em; }
          }
        </style>`;
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


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if(!isLoading) setIsOpen(open)}}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Confirmar y Facturar Venta
          </DialogTitle>
          <DialogDescription>
            Complete la información de la factura. El total de la venta es {formatCurrency(totalVenta)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto p-1">
          <div className="space-y-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <FormLabel className="text-foreground/80">Número de Factura</FormLabel>
                    <Input value={nextNumeroFactura ?? "Calculando..."} readOnly disabled className="mt-1 bg-muted/50 font-semibold" />
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
                              disabled={isLoading}
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
                                    date.setHours(now.getHours());
                                    date.setMinutes(now.getMinutes());
                                    date.setSeconds(now.getSeconds());
                                }
                                field.onChange(date);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01") || isLoading
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
                  name="clienteNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Nombre del Cliente (Opcional)</FormLabel>
                      <div className="relative">
                        <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input 
                            placeholder="Ej: Empresa XYZ" 
                            {...field} 
                            value={field.value ?? ""} 
                            className="pl-10" 
                            disabled={isLoading} 
                            list="client-suggestions"
                           />
                        </FormControl>
                      </div>
                      <datalist id="client-suggestions">
                        {clientSuggestions.map((suggestion) => (
                          <option key={suggestion} value={suggestion} />
                        ))}
                      </datalist>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione forma de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="nequi">Nequi</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
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
                          placeholder="Añada notas o comentarios sobre la venta..."
                          className="resize-none"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading || ventaItems.length === 0}>
                        {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Confirmar y Guardar Factura</>}
                    </Button>
                    </DialogFooter>
              </form>
            </Form>
          </div>

          <div className="border-l md:pl-8 pt-2 md:pt-0">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-primary flex items-center">
                    <Info size={18} className="mr-2"/> Vista Previa
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={printFacturaPreview} disabled={isLoading || !companyProfile || nextNumeroFactura === null}>
                    <Printer size={16} className="mr-2"/> Imprimir
                </Button>
            </div>
            <div id="factura-create-preview-content" className="p-1 border rounded-md bg-background text-sm max-h-[calc(70vh-80px)] overflow-y-auto">
                <div className="invoice-header">
                    {companyProfile?.logoUrl && (
                        <Image
                            src={companyProfile.logoUrl}
                            alt={`Logo de ${companyProfile.companyName}`}
                            width={60} height={40}
                            className="mx-auto mb-1 object-contain"
                            data-ai-hint="logo company"
                        />
                    )}
                    <h1 className="text-base font-bold">{companyProfile?.companyName || "Nombre Empresa"}</h1>
                    {companyProfile?.nit && <p className="text-xs">NIT: {companyProfile.nit}</p>}
                    {companyProfile?.address && <p className="text-xs">{companyProfile.address}</p>}
                    {companyProfile?.phone && <p className="text-xs">Tel: {companyProfile.phone}</p>}
                    {userEmail && <p className="text-xs">Email: {userEmail}</p>}
                </div>
                
                <div className="invoice-info mt-2">
                    <p><span>Factura Venta N°:</span> <span className="font-semibold">{nextNumeroFactura ?? "---"}</span></p>
                    <p><span>Fecha y Hora:</span> <span>{formatDateWithTimeForDisplay(form.watch("fecha"))}</span></p>
                </div>
                
                {form.watch("clienteNombre") && (
                    <>
                    <div className="section-title mt-2">Cliente</div>
                    <div className="user-details my-1">
                        <p>{form.watch("clienteNombre")}</p>
                    </div>
                    </>
                )}

                <div className="section-title mt-2">Detalle de Venta</div>
                <table className="items-table w-full text-xs my-1">
                <thead>
                    <tr>
                        <th className="col-material">Material</th>
                        <th className="col-peso text-right">Peso</th>
                        <th className="col-vunit text-right">Vr. Unit.</th>
                        <th className="col-subtotal text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                {ventaItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                    <td className="col-material">{item.materialName} {item.materialCode && `(${item.materialCode})`}</td>
                    <td className="col-peso text-right">{item.peso.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="col-vunit text-right">{formatCurrency(item.precioUnitario)}</td>
                    <td className="col-subtotal text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                ))}
                </tbody>
                </table>
                
                <div className="total-section mt-2">
                    <p>TOTAL FACTURA: <span className="total-amount">{formatCurrency(totalVenta)}</span></p>
                </div>

                {form.watch("formaDePago") && <p className="payment-method mt-1"><strong>Forma de Pago:</strong> <span className="capitalize">{form.watch("formaDePago")}</span></p>}
                
                {form.watch("observaciones") && <div className="footer-notes mt-2 pt-1 border-t"><p><strong>Observaciones:</strong> {form.watch("observaciones")}</p></div>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
