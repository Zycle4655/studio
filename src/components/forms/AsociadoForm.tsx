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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { AsociadoFormSchema, type AsociadoFormData, type TipoIdentificacionKey } from "@/schemas/sui";
import { Save, XCircle, User } from "lucide-react";

interface AsociadoFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: AsociadoFormData) => Promise<void>;
  defaultValues?: Partial<AsociadoFormData>;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

// Full labels for better user experience in the dropdown
const TIPO_ID_LABELS: Record<TipoIdentificacionKey, string> = {
  "1": "Cédula de Ciudadanía (CC)",
  "2": "Cédula de Extranjería (CE)",
  "3": "Pasaporte",
  "4": "NIT",
};


export default function AsociadoForm({
  isOpen,
  setIsOpen,
  onSubmit,
  defaultValues,
  isLoading = false,
  title = "Agregar Asociado",
  description = "Complete la información del nuevo asociado."
}: AsociadoFormProps) {
  const form = useForm<AsociadoFormData>({
    resolver: zodResolver(AsociadoFormSchema),
    defaultValues: {
      nombre: defaultValues?.nombre || "",
      tipoIdentificacion: defaultValues?.tipoIdentificacion,
      numeroIdentificacion: defaultValues?.numeroIdentificacion || "",
      telefono: defaultValues?.telefono || "",
      direccion: defaultValues?.direccion || "",
      placaVehiculo: defaultValues?.placaVehiculo || "",
      numacro: defaultValues?.numacro || undefined,
      nueca: defaultValues?.nueca || undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        nombre: defaultValues?.nombre || "",
        tipoIdentificacion: defaultValues?.tipoIdentificacion,
        numeroIdentificacion: defaultValues?.numeroIdentificacion || "",
        telefono: defaultValues?.telefono || "",
        direccion: defaultValues?.direccion || "",
        placaVehiculo: defaultValues?.placaVehiculo || null,
        numacro: defaultValues?.numacro || undefined,
        nueca: defaultValues?.nueca || undefined,
      });
    }
  }, [defaultValues, isOpen, form]);

  const handleFormSubmit = async (data: AsociadoFormData) => {
    await onSubmit(data);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-4" autoComplete="off">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del asociado" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoIdentificacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Tipo de ID</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_ID_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{`${key}: ${label}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numeroIdentificacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Número de ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Número" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Número de contacto" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección de residencia" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="placaVehiculo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Placa del Vehículo (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: ABC-123" {...field} value={field.value ?? ""} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numacro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">NUMACRO (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Número" {...field} value={String(field.value ?? "")} disabled={isLoading} onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nueca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">NUECA (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Número" {...field} value={String(field.value ?? "")} disabled={isLoading} onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Asociado</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
