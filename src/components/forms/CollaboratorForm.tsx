
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
  FormDescription,
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
import { CollaboratorFormSchema, type CollaboratorFormData, type Permissions, DEFAULT_ROLES } from "@/schemas/equipo";
import { TIPO_ID_LABELS, type TipoIdentificacionKey } from "@/schemas/sui";
import type { CargoDocument } from "@/schemas/cargo";
import { Save, XCircle, UserCog, Lock, Eye, EyeOff, Sparkles, Calendar } from "lucide-react";
import { Separator } from "../ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Timestamp } from "firebase/firestore";

interface CollaboratorFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: CollaboratorFormData) => Promise<void>;
  cargos: CargoDocument[];
  defaultValues?: Partial<CollaboratorFormData> & { fechaNacimiento?: Timestamp | null };
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
    contabilidad: "Contabilidad (Caja)",
};

const defaultPermissionsByRole: { [key: string]: Partial<Permissions> } = {
  admin: { gestionMaterial: true, transporte: true, reportes: true, sui: true, talentoHumano: true, equipo: true, contabilidad: true },
  bodeguero: { gestionMaterial: true, transporte: false, reportes: true, sui: false, talentoHumano: false, equipo: false, contabilidad: false },
  recolector: { gestionMaterial: false, transporte: true, reportes: false, sui: false, talentoHumano: false, equipo: false, contabilidad: false },
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
  const [showPassword, setShowPassword] = React.useState(false);
  const { companyProfile } = useAuth();
  const { toast } = useToast();
  const isEditing = !!defaultValues?.email;

  const form = useForm<CollaboratorFormData>({
    resolver: zodResolver(CollaboratorFormSchema),
    defaultValues: {
      nombre: "",
      email: "",
      rol: "",
      password: "",
      confirmPassword: "",
      permissions: {
        gestionMaterial: false,
        transporte: false,
        reportes: false,
        sui: false,
        talentoHumano: false,
        equipo: false,
        contabilidad: false,
      },
      tipoIdentificacion: null,
      numeroIdentificacion: null,
      fechaNacimiento: null,
      telefono: null,
      direccion: null,
      eps: null,
      afp: null,
      arl: null,
      contactoEmergenciaNombre: null,
      contactoEmergenciaTelefono: null,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            nombre: defaultValues?.nombre || "",
            email: defaultValues?.email || "",
            rol: defaultValues?.rol || "",
            password: "",
            confirmPassword: "",
            permissions: defaultValues?.permissions || {
                gestionMaterial: false,
                transporte: false,
                reportes: false,
                sui: false,
                talentoHumano: false,
                equipo: false,
                contabilidad: false,
            },
            tipoIdentificacion: defaultValues?.tipoIdentificacion || null,
            numeroIdentificacion: defaultValues?.numeroIdentificacion || null,
            fechaNacimiento: defaultValues?.fechaNacimiento?.toDate() || null,
            telefono: defaultValues?.telefono || null,
            direccion: defaultValues?.direccion || null,
            eps: defaultValues?.eps || null,
            afp: defaultValues?.afp || null,
            arl: defaultValues?.arl || null,
            contactoEmergenciaNombre: defaultValues?.contactoEmergenciaNombre || null,
            contactoEmergenciaTelefono: defaultValues?.contactoEmergenciaTelefono || null,
        });
    }
  }, [defaultValues, isOpen, form]);

  const handleRoleChange = (roleKey: string) => {
    form.setValue("rol", roleKey);
    const selectedCargo = cargos.find(c => c.name === roleKey);
    const roleNameKey = Object.keys(DEFAULT_ROLES).find(
      key => DEFAULT_ROLES[key as keyof typeof DEFAULT_ROLES] === selectedCargo?.name
    ) || 'bodeguero';
    
    const permissions = defaultPermissionsByRole[roleNameKey] || {};
    form.setValue("permissions", {
        gestionMaterial: false,
        transporte: false,
        reportes: false,
        sui: false,
        talentoHumano: false,
        equipo: false,
        contabilidad: false,
        ...permissions
    });
  };
  
  const generateEmail = () => {
    const nombre = form.getValues("nombre");
    const companyName = companyProfile?.companyName;

    if (!nombre) {
      toast({ variant: "destructive", title: "Nombre Requerido", description: "Por favor, ingrese el nombre del colaborador primero." });
      return;
    }
    if (!companyName) {
      toast({ variant: "destructive", title: "Nombre de Empresa no Encontrado", description: "No se pudo encontrar el nombre de la empresa para generar el correo." });
      return;
    }

    const sanitizedDomain = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').substring(0, 20);
    const nameParts = nombre.trim().toLowerCase().split(' ');
    let userPart = nameParts[0];
    if (nameParts.length > 1) {
      userPart = `${nameParts[0]}.${nameParts[nameParts.length - 1].charAt(0)}`;
    }

    const finalEmail = `${userPart}@${sanitizedDomain}.local`;
    form.setValue("email", finalEmail, { shouldValidate: true });
    toast({ title: "Correo Generado", description: `Se ha sugerido el correo: ${finalEmail}` });
  };
  
  const generatePassword = () => {
    const numeroIdentificacion = form.getValues("numeroIdentificacion");

    if (!numeroIdentificacion) {
      toast({ variant: "destructive", title: "Número de Documento Requerido", description: "Por favor, ingrese el número de documento para generar una contraseña." });
      return;
    }

    const generatedPassword = numeroIdentificacion;
    form.setValue("password", generatedPassword, { shouldValidate: true });
    form.setValue("confirmPassword", generatedPassword, { shouldValidate: true });

    toast({ title: "Contraseña Generada", description: `Se ha establecido la contraseña inicial como el número de documento.` });
  };


  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) setIsOpen(open); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCog className="mr-2 h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescriptionComponent>{description}</DialogDescriptionComponent>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-4" autoComplete="off">
            
            <h4 className="text-base font-semibold text-foreground">Información General</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  name="telefono"
                  render={({ field }) => (
                      <FormItem><FormLabel>Teléfono</FormLabel>
                      <FormControl><Input type="tel" placeholder="Número de contacto" {...field} value={field.value || ""} disabled={isLoading} /></FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
              />
               <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl><Input placeholder="Dirección de residencia" {...field} value={field.value || ""} disabled={isLoading} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <Separator className="my-6" />
            <h4 className="text-base font-semibold text-foreground">Información de Identificación</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="tipoIdentificacion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Documento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {Object.entries(TIPO_ID_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{`${key}: ${label}`}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="numeroIdentificacion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número de Documento</FormLabel>
                            <FormControl><Input placeholder="Número" {...field} value={field.value || ""} disabled={isLoading} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => {
                      const { onChange, value } = field;
                      const [day, setDay] = React.useState<string>("");
                      const [month, setMonth] = React.useState<string>("");
                      const [year, setYear] = React.useState<string>("");

                      // Effect to update form value when local day/month/year change
                      React.useEffect(() => {
                          const dayNum = parseInt(day, 10);
                          const monthNum = parseInt(month, 10);
                          const yearNum = parseInt(year, 10);

                          if (day && month && year && !isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum) && year.length === 4) {
                              const newDate = new Date(yearNum, monthNum - 1, dayNum);
                              // Check if date is valid
                              if (newDate.getFullYear() === yearNum && newDate.getMonth() === monthNum - 1 && newDate.getDate() === dayNum) {
                                  // Only update if date is different
                                  if (value?.getTime() !== newDate.getTime()) {
                                      onChange(newDate);
                                  }
                              } else {
                                  if (value !== null) onChange(null);
                              }
                          } else {
                              if (value !== null) onChange(null);
                          }
                      }, [day, month, year, onChange, value]);

                      // Effect to update local state when form value changes from outside
                      React.useEffect(() => {
                          if (value instanceof Date) {
                              const newDay = String(value.getDate());
                              const newMonth = String(value.getMonth() + 1);
                              const newYear = String(value.getFullYear());
                              if (day !== newDay) setDay(newDay);
                              if (month !== newMonth) setMonth(newMonth);
                              if (year !== newYear) setYear(newYear);
                          } else if (value === null) {
                              if (day !== "") setDay("");
                              if (month !== "") setMonth("");
                              if (year !== "") setYear("");
                          }
                          // This dependency array is intentionally limited to `value`
                          // to prevent loops. It only runs when the form value itself changes.
                          // eslint-disable-next-line react-hooks/exhaustive-deps
                      }, [value]);

                      return (
                          <FormItem className="md:col-span-2">
                              <FormLabel>Fecha de Nacimiento</FormLabel>
                              <div className="grid grid-cols-3 gap-2">
                                  <Input
                                      placeholder="DD"
                                      value={day}
                                      onChange={(e) => setDay(e.target.value)}
                                      maxLength={2}
                                      disabled={isLoading}
                                  />
                                  <Input
                                      placeholder="MM"
                                      value={month}
                                      onChange={(e) => setMonth(e.target.value)}
                                      maxLength={2}
                                      disabled={isLoading}
                                  />
                                  <Input
                                      placeholder="AAAA"
                                      value={year}
                                      onChange={(e) => setYear(e.target.value)}
                                      maxLength={4}
                                      disabled={isLoading}
                                  />
                              </div>
                              <FormMessage />
                          </FormItem>
                      );
                  }}
              />
            </div>

            <Separator className="my-6" />
            <h4 className="text-base font-semibold text-foreground">Información de Afiliación (Opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="eps" render={({ field }) => (<FormItem><FormLabel>EPS</FormLabel><FormControl><Input {...field} value={field.value || ""} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="afp" render={({ field }) => (<FormItem><FormLabel>AFP</FormLabel><FormControl><Input {...field} value={field.value || ""} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="arl" render={({ field }) => (<FormItem><FormLabel>ARL</FormLabel><FormControl><Input {...field} value={field.value || ""} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <Separator className="my-6" />
            <h4 className="text-base font-semibold text-foreground">Contacto de Emergencia (Opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contactoEmergenciaNombre" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} value={field.value || ""} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactoEmergenciaTelefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} value={field.value || ""} disabled={isLoading} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            
            <Separator className="my-6" />
            <h4 className="text-base font-semibold text-foreground">Información Laboral y de Acceso</h4>

            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo del Colaborador</FormLabel>
                   <Select onValueChange={handleRoleChange} value={field.value} disabled={isLoading}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un cargo..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {cargos.map((cargo) => (<SelectItem key={cargo.id} value={cargo.name}>{cargo.name}</SelectItem>))}
                      </SelectContent>
                   </Select>
                   <FormDescription className="text-xs">Puede gestionar los cargos en la sección "Gestionar Cargos".</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-foreground/80">Correo Electrónico de Acceso</FormLabel>
                      {!isEditing && (
                          <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateEmail}
                          disabled={isLoading || !form.watch("nombre")}
                          >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generar
                          </Button>
                      )}
                    </div>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} disabled={isLoading || isEditing} />
                    </FormControl>
                    {isEditing && <FormDescription className="text-xs">El correo no se puede cambiar al editar.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

               {!isEditing && (
                 <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                           <div className="flex justify-between items-center">
                            <FormLabel className="text-foreground/80">Contraseña Inicial</FormLabel>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generatePassword}
                                disabled={isLoading || !form.watch("numeroIdentificacion")}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generar
                            </Button>
                           </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <FormControl>
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="pl-10 pr-10"
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80 sr-only">Confirmar Contraseña</FormLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <FormControl>
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Confirme la contraseña" 
                                {...field} 
                                className="pl-10 pr-10"
                                autoComplete="new-password"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
               )}
            </div>
            
            <div>
              <FormLabel className="text-base font-medium text-foreground/90">Permisos de Plataforma</FormLabel>
              <p className="text-xs text-muted-foreground mb-4">Seleccione los módulos a los que tendrá acceso este colaborador.</p>
              <div className="space-y-3 mt-3">
                {Object.keys(permissionLabels).map((key) => (
                    <FormField
                        key={key}
                        control={form.control}
                        name={`permissions.${key as keyof Permissions}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading}/>
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">{permissionLabels[key as keyof Permissions]}</FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                ))}
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}><XCircle className="mr-2 h-4 w-4" />Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Colaborador</>}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
