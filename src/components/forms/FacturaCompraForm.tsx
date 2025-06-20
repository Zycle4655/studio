
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
import { Save, XCircle, CalendarIcon, Printer, FileText, User, Info, Milestone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const form = useForm<FacturaCompraFormData>({
    resolver: zodResolver(FacturaCompraFormSchema),
    defaultValues: {
      fecha: new Date(),
      formaDePago: undefined,
      observaciones: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        fecha: new Date(),
        formaDePago: undefined,
        observaciones: "",
      });
    }
  }, [isOpen, form]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-preview-content");
    if (previewElement) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Factura de Compra</title>');
      // Agrega estilos básicos para la impresión
      printWindow?.document.write(`
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .invoice-header { text-align: center; margin-bottom: 20px; }
          .invoice-header h1 { margin: 0; font-size: 1.5em; }
          .invoice-header p { margin: 2px 0; font-size: 0.9em; }
          .company-details, .invoice-details { margin-bottom: 15px; font-size: 0.9em;}
          .company-details p, .invoice-details p { margin: 3px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f2f2f2; }
          .text-right { text-align: right !important; }
          .total-section { margin-top: 20px; text-align: right; font-size: 1em; }
          .total-section p { margin: 5px 0; }
          .footer-notes { margin-top: 30px; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(previewElement.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      // Pequeño delay para asegurar que el contenido se cargue antes de imprimir
      setTimeout(() => {
         printWindow?.print();
         // printWindow?.close(); // Descomentar si quieres cerrar la ventana después de imprimir
      }, 250);
    }
  };


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Confirmar y Facturar Compra
          </DialogTitle>
          <DialogDescription>
            Revise los detalles de la compra y complete la información de la factura.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto p-1">
          {/* Columna 1: Formulario */}
          <div className="pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  name="formaDePago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Forma de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          {/* Columna 2: Vista Previa de Factura */}
          <div id="factura-preview-print-area" className="pl-2 border-l">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-primary flex items-center">
                    <Info size={18} className="mr-2"/> Vista Previa de Factura
                </h3>
                <Button variant="outline" size="sm" onClick={printFacturaPreview} disabled={compraItems.length === 0}>
                    <Printer size={16} className="mr-2"/> Imprimir
                </Button>
            </div>

            <div id="factura-preview-content" className="p-3 border rounded-md bg-card/50 text-sm">
              <div className="invoice-header">
                <h1 className="text-xl font-bold text-primary">{companyProfile?.companyName || "Nombre de Empresa"}</h1>
                {companyProfile?.nit && <p>NIT: {companyProfile.nit}</p>}
                {companyProfile?.address && <p>{companyProfile.address}</p>}
                {companyProfile?.phone && <p>Tel: {companyProfile.phone}</p>}
                {userEmail && <p>Email: {userEmail}</p>}
              </div>

              <div className="invoice-details grid grid-cols-2 gap-x-4 my-4">
                <div>
                  <p><strong>Factura de Compra N°:</strong> <span className="text-primary font-semibold">{nextNumeroFactura ?? "N/A"}</span></p>
                </div>
                <div className="text-right">
                  <p><strong>Fecha:</strong> {format(form.getValues("fecha") || new Date(), "PPP", { locale: es })}</p>
                </div>
              </div>
              
              {/* Aquí puedes agregar detalles del proveedor si los tienes */}
              {/* <div className="provider-details my-3">
                <h4 className="font-semibold">Proveedor:</h4>
                <p>Nombre del Proveedor (si aplica)</p>
                <p>NIT/C.C. del Proveedor (si aplica)</p>
              </div> */}

              <h4 className="font-semibold mt-4 mb-1">Detalle de la Compra:</h4>
              <div className="overflow-x-auto">
                <table className="items-table w-full text-xs">
                  <thead>
                    <tr>
                      <th className="py-1 px-2">Material</th>
                      <th className="py-1 px-2">Código</th>
                      <th className="py-1 px-2 text-right">Peso (kg)</th>
                      <th className="py-1 px-2 text-right">Vr. Unit.</th>
                      <th className="py-1 px-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compraItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1 px-2">{item.materialName}</td>
                        <td className="py-1 px-2">{item.materialCode || "N/A"}</td>
                        <td className="py-1 px-2 text-right">{item.peso.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-1 px-2 text-right">{formatCurrency(item.precioUnitario)}</td>
                        <td className="py-1 px-2 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="total-section mt-4">
                <p className="text-base font-bold">TOTAL FACTURA: <span className="text-primary">{formatCurrency(totalCompra)}</span></p>
              </div>

              {form.getValues("formaDePago") && (
                <p className="mt-2 text-xs"><strong>Forma de Pago:</strong> <span className="capitalize">{form.watch("formaDePago")}</span></p>
              )}
              {form.getValues("observaciones") && (
                <div className="footer-notes mt-3 pt-2 border-t">
                  <p className="text-xs"><strong>Observaciones:</strong> {form.watch("observaciones")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
