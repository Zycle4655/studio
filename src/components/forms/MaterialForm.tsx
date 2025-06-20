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

const STANDARD_MATERIAL_CODES = [
  { value: "101", label: "101 - Aluminio" },
  { value: "102", label: "102 - Chatarra" },
  { value: "103", label: "103 - Cobre" },
  { value: "104", label: "104 - Bronce" },
  { value: "105", label: "105 - Antimonio" },
  { value: "106", label: "106 - Acero" },
  { value: "199", label: "199 - Otros Metales" },
  { value: "201", label: "201 - Archivo" },
  { value: "202", label: "202 - Cartón" },
  { value: "203", label: "203 - Cubetas o Paneles" },
  { value: "204", label: "204 - Periódico" },
  { value: "205", label: "205 - Plegadiza" },
  { value: "206", label: "206 - Tetra Pak" },
  { value: "207", label: "207 - Plastificado" },
  { value: "208", label: "208 - Kraf" },
  { value: "299", label: "299 - Otros Papel y Cartón" },
  { value: "301", label: "301 - Acrílico" },
  { value: "302", label: "302 - Pasta" },
  { value: "303", label: "303 - PET" },
  { value: "304", label: "304 - PVC" },
  { value: "305", label: "305 - Plástico Blanco" },
  { value: "306", label: "306 - Polietileno" },
  { value: "307", label: "307 - Soplado" },
  { value: "308", label: "308 - Polipropileno" },
  { value: "399", label: "399 - Otros Plásticos" },
  { value: "499", label: "499 - Otros Vidrios" },
];

const NO_CODE_VALUE = "__NONE__"; // Special value for "no code" option

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
      code: defaultValues?.code || null,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || "",
        price: defaultValues?.price || undefined,
        code: defaultValues?.code || null,
      });
    }
  }, [defaultValues, isOpen, form]); // form.reset removed from deps, form should be stable

  const handleFormSubmit = async (data: MaterialFormData) => {
    const processedData = {
      ...data,
      price: parseFloat(Number(data.price).toFixed(2)),
      code: data.code === NO_CODE_VALUE ? null : data.code, 
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
                        {...field}
                        className="pl-10"
                        value={String(field.value ?? "")} 
                        onChange={(e) => {
                           // Permitir campo vacío o número
                          const val = e.target.value;
                          if (val === "") {
                            field.onChange(undefined); // o null, dependiendo de cómo manejes valores vacíos
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Código de Material (Opcional)</FormLabel>
                  <div className="relative">
                     <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Select
                      onValueChange={(value) => field.onChange(value === NO_CODE_VALUE ? null : value)}
                      value={field.value === null || field.value === undefined ? NO_CODE_VALUE : field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Seleccione un código" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CODE_VALUE}>Ninguno / Sin código</SelectItem>
                        {STANDARD_MATERIAL_CODES.map((codeOpt) => (
                          <SelectItem key={codeOpt.value} value={codeOpt.value}>
                            {codeOpt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
