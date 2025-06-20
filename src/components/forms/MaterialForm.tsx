
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
} from "@/components/ui/dialog";
import { MaterialFormSchema, type MaterialFormData } from "@/schemas/material";
import { DollarSign, Save, XCircle, Package } from "lucide-react";

interface MaterialFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: MaterialFormData) => Promise<void>;
  defaultValues?: Partial<MaterialFormData>;
  isLoading?: boolean;
  title?: string;
}

export default function MaterialForm({
  isOpen,
  setIsOpen,
  onSubmit,
  defaultValues,
  isLoading = false,
  title = "Agregar Material",
}: MaterialFormProps) {
  const form = useForm<MaterialFormData>({
    resolver: zodResolver(MaterialFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      price: defaultValues?.price || undefined, // Price puede ser undefined inicialmente
    },
  });

  React.useEffect(() => {
    // Reset form when defaultValues change (e.g., when opening for editing)
    // or when it's opened for a new entry after being used for editing.
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || "",
        price: defaultValues?.price || undefined,
      });
    }
  }, [defaultValues, isOpen, form.reset]);

  const handleFormSubmit = async (data: MaterialFormData) => {
    // Asegurar que el precio tenga como máximo dos decimales antes de enviar
    const processedData = {
      ...data,
      price: parseFloat(Number(data.price).toFixed(2)),
    };
    await onSubmit(processedData);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Nombre del Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Plástico PET, Cartón" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Precio (por unidad/kg)</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01" // Permite incrementos de céntimos
                        {...field}
                        className="pl-10"
                        value={field.value ?? ""} // Ensure value is not undefined for controlled input
                        onChange={(e) => {
                          const value = e.target.value;
                           // Allow empty string for clearing, or valid numbers
                           if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                            field.onChange(value === "" ? undefined : parseFloat(value));
                          }
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
