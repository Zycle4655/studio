
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
import { DollarSign, Save, XCircle, Package, Code } from "lucide-react";

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
      price: defaultValues?.price || undefined, 
      code: defaultValues?.code || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || "",
        price: defaultValues?.price || undefined,
        code: defaultValues?.code || null, // Asegurarse de que sea null si no hay valor
      });
    }
  }, [defaultValues, isOpen, form.reset]);

  const handleFormSubmit = async (data: MaterialFormData) => {
    const processedData = {
      ...data,
      price: parseFloat(Number(data.price).toFixed(2)),
      code: data.code || null, // Guardar null si está vacío
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
                        step="0.01" 
                        {...field} // Spread field props
                        className="pl-10"
                        value={String(field.value ?? "")} // Ensure value is string for the input
                        onChange={(e) => {
                           // Pass the raw string value to react-hook-form
                           // Zod will handle coercion to number during validation
                          field.onChange(e.target.value);
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Código de Material (Opcional)</FormLabel>
                  <div className="relative">
                    <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        placeholder="Ej: 101, 303PET" 
                        {...field} 
                        value={field.value || ""} // Para evitar que se muestre "null"
                        className="pl-10" 
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
