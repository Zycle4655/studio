
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
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { PrestamoFormSchema, type PrestamoFormData } from "@/schemas/prestamo";
import type { AsociadoDocument } from "@/schemas/sui";
import { Save, XCircle, DollarSign, HandCoins, ChevronsUpDown, Check, CalendarIcon, MessageSquare } from "lucide-react";
import { Textarea } from "../ui/textarea";

interface PrestamoFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: PrestamoFormData) => Promise<void>;
  defaultValues?: PrestamoFormData;
  isLoading: boolean;
  asociados: AsociadoDocument[];
  title: string;
}

export default function PrestamoForm({
  isOpen,
  setIsOpen,
  onSubmit,
  defaultValues,
  isLoading,
  asociados,
  title,
}: PrestamoFormProps) {
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  
  const form = useForm<PrestamoFormData>({
    resolver: zodResolver(PrestamoFormSchema),
    defaultValues: {
      asociadoId: defaultValues?.asociadoId || "",
      monto: defaultValues?.monto || undefined,
      fecha: defaultValues?.fecha || new Date(),
      observaciones: defaultValues?.observaciones || "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        asociadoId: defaultValues?.asociadoId || "",
        monto: defaultValues?.monto || undefined,
        fecha: defaultValues?.fecha instanceof Date ? defaultValues.fecha : new Date(),
        observaciones: defaultValues?.observaciones || "",
      });
    }
  }, [defaultValues, isOpen, form]);

  const handleFormSubmit = async (data: PrestamoFormData) => {
    await onSubmit(data);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HandCoins className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Complete la información del préstamo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4" autoComplete="off">
            
            <FormField
              control={form.control}
              name="asociadoId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground/80">Asociado</FormLabel>
                  <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                          disabled={isLoading}
                        >
                          {field.value
                            ? asociados.find(asociado => asociado.id === field.value)?.nombre
                            : "Seleccione un asociado"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar asociado..." />
                        <CommandList>
                          <CommandEmpty>No se encontró el asociado.</CommandEmpty>
                          <CommandGroup>
                            {asociados.map(asociado => (
                              <CommandItem
                                value={asociado.nombre}
                                key={asociado.id}
                                onSelect={() => {
                                  form.setValue("asociadoId", asociado.id);
                                  setIsComboboxOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", asociado.id === field.value ? "opacity-100" : "opacity-0")} />
                                {asociado.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Monto del Préstamo (COP)</FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        step="1"
                        {...field}
                        className="pl-10"
                        value={String(field.value ?? "")}
                        disabled={isLoading}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground/80">Fecha del Préstamo</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          disabled={isLoading}
                        >
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date => date > new Date() || date < new Date("1900-01-01") || isLoading}
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
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Observaciones (Opcional)</FormLabel>
                   <div className="relative">
                     <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                       <Textarea
                        placeholder="Añada notas sobre el préstamo..."
                        className="resize-none pl-10"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Préstamo</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

