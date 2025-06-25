
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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription as DialogDescriptionComponent,
} from "@/components/ui/dialog";
import { CollaboratorFormSchema, type CollaboratorFormData, type Permissions } from "@/schemas/equipo";
import type { CargoDocument } from "@/schemas/cargo";
import { Save, XCircle, UserCog } from "lucide-react";
import { Separator } from "../ui/separator";

interface CollaboratorFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CollaboratorFormData) => Promise<void>;
  cargos: CargoDocument[];
  defaultValues?: Partial<CollaboratorFormData> | null;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

const permissionLabels: { [key in keyof Permissions]: string } = {
    gestionMaterial: "Gestión de Material",
    transporte: "Transporte",
    reportes: "Reportes",
    sui: "SUI",
    talentoHumano: "Talento Humano",
    equipo: "Gestión de Equipo (Admin)",
};

export default function CollaboratorForm({
  isOpen,
  setIsOpen,
  onSubmit,
  cargos,
  defaultValues,
  isLoading = false,
  title = "Agregar Colaborador",
  description = "Complete la información del nuevo colaborador."
}: CollaboratorFormProps) {
  const form = useForm<CollaboratorFormData>({
    resolver: zodResolver(CollaboratorFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      rol: "",
      permissions: {
        gestionMaterial: false,
        transporte: false,
        reportes: false,
        sui: false,
        talentoHumano: false,
        equipo: false,
      },
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            nombre: defaultValues?.nombre || "",
            email: defaultValues?.email || "",
            rol: defaultValues?.rol || "",
            permissions: defaultValues?.permissions || {
                gestionMaterial: false,
                transporte: false,
                reportes: false,
                sui: false,
                talentoHumano: false,
                equipo: false,
            },
        });
    }
  }, [defaultValues, isOpen, form]);

  const handleFormSubmit = async (data: CollaboratorFormData) => {
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
            <UserCog className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescriptionComponent>{description}</DialogDescriptionComponent>}
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
                    <Input placeholder="Nombre del colaborador" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Cargo del Colaborador</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cargo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cargos.map((cargo) => (
                            <SelectItem key={cargo.id} value={cargo.name}>{cargo.name}</SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                   <FormDescription className="text-xs">
                        Puede gestionar los cargos en la sección "Gestionar Cargos".
                    </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <div>
              <FormLabel className="text-base font-medium text-foreground/90">Permisos de Plataforma</FormLabel>
              <p className="text-sm text-muted-foreground text-xs mb-4">Seleccione los módulos a los que tendrá acceso este colaborador.</p>
              <div className="space-y-3 mt-3">
                {Object.keys(permissionLabels).map((key) => (
                    <FormField
                        key={key}
                        control={form.control}
                        name={`permissions.${key as keyof Permissions}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                        {permissionLabels[key as keyof Permissions]}
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                ))}
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Colaborador</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
