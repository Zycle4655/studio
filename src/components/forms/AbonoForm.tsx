
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { AbonoFormSchema, type AbonoFormData, type PrestamoDocument } from "@/schemas/prestamo";
import { Save, XCircle, DollarSign, CalendarIcon, Banknote, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AbonoFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: AbonoFormData) => Promise<void>;
  prestamo: PrestamoDocument;
  isLoading: boolean;
}

export default function AbonoForm({
  isOpen,
  setIsOpen,
  onSubmit,
  prestamo,
  isLoading,
}: AbonoFormProps) {
    const { toast } = useToast();
  
    const form = useForm<AbonoFormData>({
        resolver: zodResolver(AbonoFormSchema),
        defaultValues: {
        monto: undefined,
        fecha: new Date(),
        },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        monto: undefined,
        fecha: new Date(),
      });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: AbonoFormData) => {
    if(data.monto > prestamo.saldoPendiente) {
        form.setError("monto", { type: "manual", message: `El abono no puede exceder el saldo de ${formatCurrency(prestamo.saldoPendiente)}.` });
        toast({
            variant: "destructive",
            title: "Monto de Abono Inválido",
            description: `El abono no puede ser mayor que el saldo pendiente.`,
        });
        return;
    }
    onSubmit(data);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Banknote className="mr-2 h-5 w-5 text-primary" />
            Registrar Abono a Préstamo
          </DialogTitle>
          <DialogDescription>
            Abono para {prestamo.asociadoNombre}. Saldo actual: <span className="font-bold text-destructive">{formatCurrency(prestamo.saldoPendiente)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4" autoComplete="off">
            
             <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Monto del Abono (COP)</FormLabel>
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
                  <FormLabel className="text-foreground/80">Fecha del Abono</FormLabel>
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
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Registrar Abono</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
