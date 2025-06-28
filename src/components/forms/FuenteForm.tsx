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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { FuenteFormSchema, type FuenteFormData } from "@/schemas/fuente";
import { Save, XCircle, Building, MapPin, User, Phone, Mail } from "lucide-react";

interface FuenteFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: FuenteFormData) => Promise<void>;
  defaultValues?: Partial<FuenteFormData>;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function FuenteForm({
  isOpen,
  setIsOpen,
  onSubmit,
  defaultValues,
  isLoading = false,
  title = "Agregar Nueva Fuente",
  description = "Complete la información de la fuente de recolección."
}: FuenteFormProps) {
  const form = useForm<FuenteFormData>({
    resolver: zodResolver(FuenteFormSchema),
    defaultValues: {
      nombre: "",
      direccion: "",
      encargadoNombre: "",
      encargadoTelefono: "",
      encargadoEmail: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        nombre: defaultValues?.nombre || "",
        direccion: defaultValues?.direccion || "",
        encargadoNombre: defaultValues?.encargadoNombre || "",
        encargadoTelefono: defaultValues?.encargadoTelefono || "",
        encargadoEmail: defaultValues?.encargadoEmail || null,
      });
    }
  }, [defaultValues, isOpen, form]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-4" autoComplete="off">
            
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Fuente</FormLabel>
                   <div className="relative">
                     <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input placeholder="Ej: Conjunto Residencial Las Palmas" {...field} disabled={isLoading} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input placeholder="Dirección completa" {...field} disabled={isLoading} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-sm font-semibold text-foreground pt-2">Información del Encargado</h3>
            
            <FormField
              control={form.control}
              name="encargadoNombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Encargado</FormLabel>
                  <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input placeholder="Nombre completo" {...field} disabled={isLoading} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encargadoTelefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono del Encargado</FormLabel>
                  <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input type="tel" placeholder="Número de contacto" {...field} disabled={isLoading} className="pl-10" /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encargadoEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email del Encargado (Opcional)</FormLabel>
                  <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} value={field.value ?? ""} disabled={isLoading} className="pl-10" /></FormControl>
                  </div>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Fuente</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
