
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
import { CargoFormSchema, type CargoFormData } from "@/schemas/cargo";
import { Save, XCircle, Briefcase } from "lucide-react";

interface CargoFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CargoFormData) => Promise<void>;
  defaultValues?: Partial<CargoFormData>;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function CargoForm({
  isOpen,
  setIsOpen,
  onSubmit,
  defaultValues,
  isLoading = false,
  title = "Agregar Cargo",
  description = "Defina un nuevo cargo para los colaboradores de su empresa."
}: CargoFormProps) {
  const form = useForm<CargoFormData>({
    resolver: zodResolver(CargoFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || "",
      });
    }
  }, [defaultValues, isOpen, form]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4" autoComplete="off">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Nombre del Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Operador de Máquina" {...field} disabled={isLoading} />
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Cargo</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
