
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
import { Building, Hash, Phone, MapPin, Save, Mail, Image as ImageIcon, UploadCloud, X, Fingerprint } from "lucide-react";
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
      suiId: propsDefaultValues?.suiId || null,
      phone: propsDefaultValues?.phone || "",
      address: propsDefaultValues?.address || "",
      email: propsDefaultValues?.email || "",
      logoUrl: propsDefaultValues?.logoUrl || null,
    },
  });

  React.useEffect(() => {
    setLogoPreview(propsDefaultValues?.logoUrl || null);
    form.reset({
        companyName: propsDefaultValues?.companyName || "",
        nit: propsDefaultValues?.nit || "",
        suiId: propsDefaultValues?.suiId || null,
        phone: propsDefaultValues?.phone || "",
        address: propsDefaultValues?.address || "",
        email: propsDefaultValues?.email || "",
        logoUrl: propsDefaultValues?.logoUrl || null,
    });
  }, [propsDefaultValues, form]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        form.setValue("logoUrl", dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setLogoPreview(propsDefaultValues?.logoUrl || null);
      form.setValue("logoUrl", propsDefaultValues?.logoUrl || null);
    }
  };

  const handleRemoveLogo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Evita que el click en el botón de eliminar active el click en el div padre.
    setSelectedFile(null);
    setLogoPreview(null);
    form.setValue('logoUrl', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (data: CompanyProfileFormData) => {
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
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">NIT</FormLabel>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="NIT de la empresa" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="suiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">ID SUI (ECA) (Opcional)</FormLabel>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="ID asignado por la SUI" {...field} value={field.value ?? ""} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

            <FormField
                control={form.control}
                name="logoUrl"
                render={() => (
                    <FormItem>
                        <FormLabel className="text-foreground/80">Logo de la Empresa</FormLabel>
                        <FormControl>
                             <div
                                className="w-full flex justify-center items-center p-4 border-2 border-dashed rounded-md cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/gif, image/webp"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {logoPreview ? (
                                    <div className="relative group">
                                        <Image
                                            src={logoPreview}
                                            alt="Vista previa del logo"
                                            width={128}
                                            height={128}
                                            className="rounded-md object-contain h-32 w-32 bg-white"
                                            data-ai-hint="logo company"
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-sm">Cambiar Logo</p>
                                        </div>
                                         <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="icon" 
                                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                            onClick={handleRemoveLogo}
                                            aria-label="Eliminar logo"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <UploadCloud className="h-8 w-8" />
                                        <p className="font-semibold">Haz clic para subir tu logo</p>
                                        <p className="text-xs">PNG, JPG, GIF (Max. 1MB)</p>
                                    </div>
                                )}
                            </div>
                        </FormControl>
                         <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
                    </FormItem>
                )}
            />

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
