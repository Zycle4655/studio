
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyProfileSchema, type CompanyProfileFormData } from "@/schemas/company";
import { Building, Hash, Phone, MapPin, Save, Mail, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import Image from 'next/image';

interface CompanyProfileFormProps {
  onSubmit: (data: CompanyProfileFormData, logoFile?: File | null) => Promise<void>;
  defaultValues?: CompanyProfileFormData;
  isLoading?: boolean;
  submitButtonText?: string;
  title?: string;
  description?: string;
  isEditing?: boolean;
}

export default function CompanyProfileForm({
  onSubmit,
  defaultValues: propsDefaultValues,
  isLoading = false,
  submitButtonText = "Guardar Perfil",
  title = "Perfil de la Empresa",
  description = "Complete la información de su empresa.",
  isEditing = false,
}: CompanyProfileFormProps) {
  const [logoPreview, setLogoPreview] = React.useState<string | null>(propsDefaultValues?.logoUrl || null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<CompanyProfileFormData>({
    resolver: zodResolver(CompanyProfileSchema),
    defaultValues: {
      companyName: propsDefaultValues?.companyName || "",
      nit: propsDefaultValues?.nit || "",
      phone: propsDefaultValues?.phone || "",
      address: propsDefaultValues?.address || "",
      email: propsDefaultValues?.email || "",
      logoUrl: propsDefaultValues?.logoUrl || null, // Este se usará para el valor inicial
    },
  });

  React.useEffect(() => {
    // Sincronizar el preview si defaultValues.logoUrl cambia (ej. después de guardar y volver a editar)
    setLogoPreview(propsDefaultValues?.logoUrl || null);
    // Resetear el formulario con los valores actualizados, especialmente logoUrl
    form.reset({
        companyName: propsDefaultValues?.companyName || "",
        nit: propsDefaultValues?.nit || "",
        phone: propsDefaultValues?.phone || "",
        address: propsDefaultValues?.address || "",
        email: propsDefaultValues?.email || "",
        logoUrl: propsDefaultValues?.logoUrl || null,
    });
  }, [propsDefaultValues, form.reset]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("logoUrl", "file_selected"); // Placeholder para que Zod no falle si es requerido, la URL real se establecerá al subir
    } else {
      // Si no se selecciona archivo, y antes había un propsDefaultValues.logoUrl, volvemos a ese.
      // Si no, lo dejamos como null.
      setSelectedFile(null);
      setLogoPreview(propsDefaultValues?.logoUrl || null);
      form.setValue("logoUrl", propsDefaultValues?.logoUrl || null);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    form.setValue('logoUrl', null); // Indicar que se quiere eliminar el logo existente
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpiar el input de archivo
    }
  };

  const handleFormSubmit = async (data: CompanyProfileFormData) => {
    // Si se seleccionó un nuevo archivo, logoFile no será null.
    // Si se eliminó el logo, data.logoUrl será null.
    // Si no se tocó el logo, data.logoUrl será la URL existente (si la había).
    await onSubmit(data, selectedFile);
  };
  
  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary font-headline">{title}</CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            
            <FormItem>
              <FormLabel className="text-foreground/80">Logo de la Empresa</FormLabel>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <Image
                      src={logoPreview}
                      alt="Vista previa del logo"
                      width={80}
                      height={80}
                      className="rounded-md border object-contain bg-muted"
                      data-ai-hint="logo company"
                    />
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80"
                        onClick={handleRemoveLogo}
                        aria-label="Eliminar logo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {logoPreview ? "Cambiar Logo" : "Subir Logo"}
                </Button>
              </div>
              <FormControl>
                <Input
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </FormControl>
              <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
            </FormItem>

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Nombre de la Empresa</FormLabel>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Nombre de su empresa" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">NIT</FormLabel>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Número de Identificación Tributaria" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Teléfono</FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input type="tel" placeholder="Número de contacto" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Dirección</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Dirección de la empresa" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Correo Electrónico de la Cuenta</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input type="email" placeholder="su.correo@ejemplo.com" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Guardando..." : submitButtonText}
              <Save className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter />
    </Card>
  );
}
