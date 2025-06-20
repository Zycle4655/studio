
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Save, XCircle, Package, Weight, Info, ChevronsUpDown, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompraMaterialItemFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CompraMaterialItemFormData) => void; // Ya es síncrono desde el padre
  materials: MaterialDocument[];
  defaultValues?: Partial<CompraMaterialItemFormData>;
  isLoading?: boolean; // Este isLoading es el del formulario padre (isSavingInvoice)
  title?: string;
  isEditingInvoiceItem?: boolean;
}

export default function CompraMaterialItemForm({
  isOpen,
  setIsOpen,
  onSubmit,
  materials,
  defaultValues,
  // isLoading prop ya no se usa aquí directamente para deshabilitar el botón del modal,
  // se usará isSubmittingItem
  title = "Agregar Ítem",
  isEditingInvoiceItem = false,
}: CompraMaterialItemFormProps) {
  const form = useForm<CompraMaterialItemFormData>({
    resolver: zodResolver(CompraMaterialItemFormSchema),
    defaultValues: {
      materialId: defaultValues?.materialId || "",
      peso: defaultValues?.peso || undefined,
      precioUnitario: defaultValues?.precioUnitario || undefined,
    },
  });

  const [selectedMaterialBasePrice, setSelectedMaterialBasePrice] = React.useState<number | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = React.useState(false);


  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        materialId: defaultValues?.materialId || "",
        peso: defaultValues?.peso || undefined,
        precioUnitario: defaultValues?.precioUnitario || undefined,
      });

      if (defaultValues?.materialId) {
        const mat = materials.find(m => m.id === defaultValues.materialId);
        setSelectedMaterialBasePrice(mat?.price || null);
        if (mat && defaultValues.precioUnitario === undefined) {
          form.setValue("precioUnitario", mat.price);
        }
      } else {
        setSelectedMaterialBasePrice(null);
      }
       setIsSubmittingItem(false); // Reset submitting state when dialog opens/resets
    }
  }, [defaultValues, isOpen, form, materials]);

  const handleMaterialSelect = (materialId: string) => {
    form.setValue("materialId", materialId);
    const selectedMat = materials.find(m => m.id === materialId);
    setSelectedMaterialBasePrice(selectedMat?.price || null);
    if (selectedMat && (!isEditingInvoiceItem || form.getValues("precioUnitario") === undefined)) {
        form.setValue("precioUnitario", selectedMat.price);
    }
    setIsComboboxOpen(false);
  };

  const formatCurrencyDisplay = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const currentPrecioUnitario = form.watch("precioUnitario");

  // Esta función interna llama al onSubmit pasado por props.
  const callParentOnSubmit = (data: CompraMaterialItemFormData) => {
    setIsSubmittingItem(true);
    try {
      onSubmit(data); // onSubmit (handleItemFormSubmit de la página padre) es síncrono
    } catch (error) {
      console.error("Error submitting item form:", error);
      // Aquí se podría añadir un toast de error si onSubmit pudiera fallar
    } finally {
      setIsSubmittingItem(false);
      // El cierre del modal (setIsOpen(false)) lo maneja la página padre después de que onSubmit se complete.
    }
  };

  // Nueva función para el onClick del botón de guardar del modal
  const handleModalFormSubmit = async () => {
    const isValid = await form.trigger(); // Valida solo el formulario del modal
    if (isValid) {
      callParentOnSubmit(form.getValues() as CompraMaterialItemFormData);
    }
  };


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!isSubmittingItem) setIsOpen(open)}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          {/* OJO: NO hay <form onSubmit={...}> aquí, el submit lo manejamos con el onClick del botón */}
          <div className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground/80">Material</FormLabel>
                  <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmittingItem || materials.length === 0 || (isEditingInvoiceItem && !!defaultValues?.materialId)}
                        >
                          {field.value
                            ? materials.find(
                                (material) => material.id === field.value
                              )?.name
                            : (materials.length > 0 ? "Seleccione un material" : "No hay materiales")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {!(isEditingInvoiceItem && !!defaultValues?.materialId) && (
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar material..." />
                          <CommandList>
                            <CommandEmpty>No se encontró el material.</CommandEmpty>
                            <CommandGroup>
                              {materials.map((material) => (
                                <CommandItem
                                  value={material.name}
                                  key={material.id}
                                  onSelect={() => handleMaterialSelect(material.id)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      material.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {material.name} {material.code ? `(${material.code})` : ''}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    )}
                  </Popover>
                  {selectedMaterialBasePrice !== null && !(isEditingInvoiceItem && defaultValues?.precioUnitario !== undefined) && (
                     <p className="text-xs text-muted-foreground pt-1 flex items-center">
                        <Info size={14} className="mr-1 text-primary"/> Precio base: {formatCurrencyDisplay(selectedMaterialBasePrice)} /kg
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
                        disabled={isSubmittingItem}
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

             <FormField
                control={form.control}
                name="precioUnitario"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-foreground/80">Precio Unitario (COP/kg)</FormLabel>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <FormControl>
                        <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            {...field}
                            className="pl-10"
                            value={String(field.value ?? "")}
                            disabled={isSubmittingItem}
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
             {currentPrecioUnitario !== undefined && form.getValues("peso") !== undefined && (
                <div className="text-sm text-muted-foreground pt-1 text-right">
                   Subtotal Ítem: {formatCurrencyDisplay( (currentPrecioUnitario || 0) * (form.getValues("peso") || 0) )}
                </div>
            )}


            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingItem}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleModalFormSubmit} // Cambiado aquí
                disabled={isSubmittingItem || materials.length === 0}
              >
                {isSubmittingItem ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> {defaultValues?.materialId ? "Actualizar Ítem" : "Agregar Ítem"}</>}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
