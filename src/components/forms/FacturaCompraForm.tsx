
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
import { Save, XCircle, CalendarIcon, FileText, UserSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
// Image import no longer needed here if preview is removed

interface FacturaCompraFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: FacturaCompraFormData) => Promise<void>;
  isLoading?: boolean;
  compraItems: CompraMaterialItem[];
  totalCompra: number; // Still needed for potential display or if onSubmit needs it
  nextNumeroFactura: number | null;
  companyProfile: CompanyProfileDocument | null; // Kept for potential future use or if onSubmit logic relies on it
  userEmail: string | null; // Kept for potential future use
}

export default function FacturaCompraForm({
  isOpen,
  setIsOpen,
  onSubmit,
  isLoading = false,
  compraItems,
  totalCompra,
  nextNumeroFactura,
  companyProfile, // Prop remains
  userEmail,     // Prop remains
}: FacturaCompraFormProps) {
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

  // formatCurrency might still be useful if total is displayed briefly or passed somewhere.
  // const formatCurrency = (value: number) => {
  //   return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  // };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if(!isLoading) setIsOpen(open)}}>
      <DialogContent className="sm:max-w-md"> {/* Adjusted max-width */}
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Confirmar y Facturar Compra
          </DialogTitle>
          <DialogDescription>
            Complete la información de la factura. El total es {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalCompra)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto p-1"> {/* Simplified layout container */}
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
      </DialogContent>
    </Dialog>
  );
}
