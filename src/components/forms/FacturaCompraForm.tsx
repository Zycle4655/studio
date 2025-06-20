
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
import { FacturaCompraFormSchema, type FacturaCompraFormData, type CompraMaterialItem } from "@/schemas/compra";
import type { CompanyProfileDocument } from "@/schemas/company";
import { Save, XCircle, CalendarIcon, FileText, UserSquare, Printer, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image"; // Re-added import
import { useToast } from "@/hooks/use-toast"; // Added toast for print error

interface FacturaCompraFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: FacturaCompraFormData) => Promise<void>;
  isLoading?: boolean;
  compraItems: CompraMaterialItem[];
  totalCompra: number;
  nextNumeroFactura: number | null;
  companyProfile: CompanyProfileDocument | null;
  userEmail: string | null;
}

export default function FacturaCompraForm({
  isOpen,
  setIsOpen,
  onSubmit,
  isLoading = false,
  compraItems,
  totalCompra,
  nextNumeroFactura,
  companyProfile,
  userEmail,
}: FacturaCompraFormProps) {
  const { toast } = useToast(); // Added for print error
  const form = useForm<FacturaCompraFormData>({
    resolver: zodResolver(FacturaCompraFormSchema),
    defaultValues: {
      fecha: new Date(),
      formaDePago: "efectivo",
      proveedorNombre: "",
      observaciones: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        fecha: new Date(),
        formaDePago: "efectivo",
        proveedorNombre: "",
        observaciones: "",
      });
    }
  }, [isOpen, form]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateForDisplay = (timestamp: Date | undefined): string => {
    if (!timestamp) return "N/A";
    return format(timestamp, "PPP", { locale: es });
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-create-preview-content");
    if (previewElement && companyProfile && nextNumeroFactura !== null) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura de Compra N° '+ nextNumeroFactura +'</title>');
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


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if(!isLoading) setIsOpen(open)}}>
      <DialogContent className="max-w-4xl"> {/* Adjusted max-width for preview */}
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Confirmar y Facturar Compra
          </DialogTitle>
          <DialogDescription>
            Complete la información de la factura. El total de la compra es {formatCurrency(totalCompra)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto p-1"> {/* Grid for two columns */}
          {/* Columna del Formulario */}
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
                              disabled={isLoading}
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
                  name="proveedorNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Nombre del Proveedor (Opcional)</FormLabel>
                      <div className="relative">
                        <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="Ej: Juan Pérez" {...field} value={field.value ?? ""} className="pl-10" disabled={isLoading} />
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
                          placeholder="Añada notas o comentarios sobre la compra..."
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
                    <Button type="submit" disabled={isLoading || compraItems.length === 0}>
                        {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Confirmar y Guardar Factura</>}
                    </Button>
                    </DialogFooter>
              </form>
            </Form>
          </div>

          {/* Columna de la Vista Previa */}
          <div className="border-l md:pl-8 pt-2 md:pt-0">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-primary flex items-center">
                    <Info size={18} className="mr-2"/> Vista Previa
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={printFacturaPreview} disabled={isLoading || !companyProfile || nextNumeroFactura === null}>
                    <Printer size={16} className="mr-2"/> Imprimir
                </Button>
            </div>
            <div id="factura-create-preview-content" className="p-3 border rounded-md bg-card/50 text-sm max-h-[calc(70vh-80px)] overflow-y-auto"> {/* Adjusted max-height */}
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
                    <div><p><strong>N° Factura:</strong> <span className="text-primary font-semibold">{nextNumeroFactura ?? "---"}</span></p></div>
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
                  <table className="items-table w-full text-xs my-2">
                    <thead><tr><th>Material</th><th className="text-right">Peso</th><th className="text-right">Vr. Unit.</th><th className="text-right">Subtotal</th></tr></thead>
                    <tbody>
                    {compraItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                        <td>{item.materialName}</td>
                        <td className="text-right">{item.peso.toLocaleString('es-CO')}</td>
                        <td className="text-right">{formatCurrency(item.precioUnitario)}</td>
                        <td className="text-right">{formatCurrency(item.subtotal)}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                <div className="total-section mt-4"><p>TOTAL FACTURA: <span className="total-amount">{formatCurrency(totalCompra)}</span></p></div>
                {form.watch("formaDePago") && <p className="mt-2 text-xs"><strong>Forma de Pago:</strong> <span className="capitalize">{form.watch("formaDePago")}</span></p>}
                {form.watch("observaciones") && <div className="footer-notes mt-3 pt-2 border-t"><p className="text-xs"><strong>Observaciones:</strong> {form.watch("observaciones")}</p></div>}
                <div className="signature-area"><div className="signature-block"><p>Firma Proveedor:</p><div className="signature-line"></div></div><div className="signature-block"><p>Firma Recibido (Empresa):</p><div className="signature-line"></div></div></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

