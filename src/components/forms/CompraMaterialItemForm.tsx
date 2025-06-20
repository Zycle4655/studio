
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
} from "@/components/ui/dialog";
import { CompraMaterialItemFormSchema, type CompraMaterialItemFormData } from "@/schemas/compra";
import type { MaterialDocument } from "@/schemas/material";
import { DollarSign, Save, XCircle, Package, Weight, Info } from "lucide-react";

interface CompraMaterialItemFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CompraMaterialItemFormData) => void;
  materials: MaterialDocument[];
  defaultValues?: Partial<CompraMaterialItemFormData>;
  isLoading?: boolean;
  title?: string;
}

export default function CompraMaterialItemForm({
  isOpen,
  setIsOpen,
  onSubmit,
  materials,
  defaultValues,
  isLoading = false,
  title = "Agregar Ítem a la Compra",
}: CompraMaterialItemFormProps) {
  const form = useForm<CompraMaterialItemFormData>({
    resolver: zodResolver(CompraMaterialItemFormSchema),
    defaultValues: {
      materialId: defaultValues?.materialId || "",
      peso: defaultValues?.peso || undefined,
    },
  });

  const [selectedMaterialPrice, setSelectedMaterialPrice] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        materialId: defaultValues?.materialId || "",
        peso: defaultValues?.peso || undefined,
      });
      if (defaultValues?.materialId) {
        const mat = materials.find(m => m.id === defaultValues.materialId);
        setSelectedMaterialPrice(mat?.price || null);
      } else {
        setSelectedMaterialPrice(null);
      }
    }
  }, [defaultValues, isOpen, form, materials]);

  const handleMaterialChange = (materialId: string) => {
    form.setValue("materialId", materialId);
    const selectedMat = materials.find(m => m.id === materialId);
    setSelectedMaterialPrice(selectedMat?.price || null);
  };
  
  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Material</FormLabel>
                  <Select
                    onValueChange={(value) => handleMaterialChange(value)}
                    value={field.value}
                    disabled={materials.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={materials.length > 0 ? "Seleccione un material" : "No hay materiales"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} {material.code ? `(${material.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMaterialPrice !== null && (
                     <p className="text-xs text-muted-foreground pt-1 flex items-center">
                        <Info size={14} className="mr-1 text-primary"/> Precio actual: {formatCurrency(selectedMaterialPrice)} /kg
                     </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="peso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Peso (kg)</FormLabel>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        {...field}
                        className="pl-10"
                        value={String(field.value ?? "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            field.onChange(undefined);
                          } else {
                            const num = parseFloat(val);
                            field.onChange(isNaN(num) ? undefined : num);
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
              <Button type="submit" disabled={isLoading || materials.length === 0}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> {defaultValues?.materialId ? "Actualizar Ítem" : "Agregar Ítem"}</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    

    