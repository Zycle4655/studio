
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
import { VentaMaterialItemFormSchema, type VentaMaterialItemFormData, type VentaMaterialItem } from "@/schemas/venta";
import type { MaterialDocument } from "@/schemas/material";
import { Save, XCircle, Package, Weight, Info, ChevronsUpDown, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VentaMaterialItemFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: VentaMaterialItemFormData) => void;
  materials: MaterialDocument[];
  currentSaleItems: VentaMaterialItem[];
  defaultValues?: Partial<VentaMaterialItemFormData>;
  isLoading?: boolean;
  title?: string;
  isEditingInvoiceItem?: boolean;
}

export default function VentaMaterialItemForm({
  isOpen,
  setIsOpen,
  onSubmit,
  materials,
  currentSaleItems,
  defaultValues,
  isLoading = false,
  title = "Agregar Ítem",
  isEditingInvoiceItem = false,
}: VentaMaterialItemFormProps) {
  const { toast } = useToast();
  const form = useForm<VentaMaterialItemFormData>({
    resolver: zodResolver(VentaMaterialItemFormSchema),
    defaultValues: {
      materialId: defaultValues?.materialId || "",
      peso: defaultValues?.peso || undefined,
      precioUnitario: defaultValues?.precioUnitario || undefined,
    },
  });

  const [selectedMaterialInfo, setSelectedMaterialInfo] = React.useState<{ price: number | null; stock: number | null }>({ price: null, stock: null });
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        materialId: defaultValues?.materialId || "",
        peso: defaultValues?.peso || undefined,
        precioUnitario: defaultValues?.precioUnitario || undefined,
      });

      if (defaultValues?.materialId) {
        const mat = materials.find(m => m.id === defaultValues.materialId);
        setSelectedMaterialInfo({ price: mat?.price || null, stock: mat?.stock || null });
        if (mat && defaultValues.precioUnitario === undefined) {
          form.setValue("precioUnitario", mat.price);
        }
      } else {
        setSelectedMaterialInfo({ price: null, stock: null });
      }
    }
  }, [defaultValues, isOpen, form, materials]);

  const handleMaterialSelect = (materialId: string) => {
    form.setValue("materialId", materialId);
    const selectedMat = materials.find(m => m.id === materialId);
    setSelectedMaterialInfo({ price: selectedMat?.price || null, stock: selectedMat?.stock || 0 });
    if (selectedMat) {
      form.setValue("precioUnitario", selectedMat.price);
    }
    setIsComboboxOpen(false);
  };

  const formatCurrencyDisplay = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const formatStockDisplay = (value: number | null | undefined) => {
      if (value === null || value === undefined) return "N/A";
      return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };

  const currentPrecioUnitario = form.watch("precioUnitario");

  const handleFormInternalSubmit = (data: VentaMaterialItemFormData) => {
    // Parent component already does the definitive stock check,
    // but we can do a quick check here for better UX inside the modal
    const selectedMaterial = materials.find(m => m.id === data.materialId);
    const availableStock = selectedMaterial?.stock || 0;
    const editingId = defaultValues?.materialId ? (currentSaleItems.find(i => i.materialId === defaultValues.materialId)?.id) : null;

    const weightInCart = currentSaleItems
        .filter(item => item.materialId === data.materialId && item.id !== editingId)
        .reduce((sum, item) => sum + item.peso, 0);

    if (data.peso + weightInCart > availableStock) {
        toast({
            variant: "destructive",
            title: "Stock Insuficiente",
            description: `No puede vender más de ${formatStockDisplay(availableStock)} de ${selectedMaterial?.name}. Ya tiene ${formatStockDisplay(weightInCart)} en la venta.`
        });
        return;
    }
    onSubmit(data);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!isLoading) setIsOpen(open)}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormInternalSubmit)} className="space-y-6 py-4">
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
                          disabled={isLoading || materials.length === 0 || isEditingInvoiceItem}
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
                    {!isEditingInvoiceItem && (
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
                                  disabled={(material.stock || 0) <= 0}
                                  className={cn((material.stock || 0) <= 0 && "text-muted-foreground line-through")}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      material.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {material.name} (Stock: {formatStockDisplay(material.stock)})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    )}
                  </Popover>
                  {selectedMaterialInfo.stock !== null && (
                     <p className="text-xs text-muted-foreground pt-1 flex items-center">
                        <Info size={14} className="mr-1 text-primary"/> Stock disponible: {formatStockDisplay(selectedMaterialInfo.stock)}
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
                  <FormLabel className="text-foreground/80">Peso a Vender (kg)</FormLabel>
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
                        disabled={isLoading}
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
                    <FormLabel className="text-foreground/80">Precio de Venta (COP/kg)</FormLabel>
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
                            disabled={isLoading}
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
                     <p className="text-xs text-muted-foreground pt-1 flex items-center">
                        <Info size={14} className="mr-1 text-primary"/> Precio base sugerido: {formatCurrencyDisplay(selectedMaterialInfo.price)} /kg
                     </p>
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
                <Button type="button" variant="outline" disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isLoading || materials.length === 0}
              >
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> {defaultValues?.materialId ? "Actualizar Ítem" : "Agregar Ítem"}</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
