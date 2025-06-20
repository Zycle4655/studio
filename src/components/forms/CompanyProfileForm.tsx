
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
import { Building, Hash, Phone, MapPin, Save, Mail, Image as ImageIcon } from "lucide-react";
import Image from 'next/image';


interface CompanyProfileFormProps {
  onSubmit: (data: CompanyProfileFormData) => Promise<void>;
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

  const form = useForm<CompanyProfileFormData>({
    resolver: zodResolver(CompanyProfileSchema),
    defaultValues: {
      companyName: propsDefaultValues?.companyName || "",
      nit: propsDefaultValues?.nit || "",
      phone: propsDefaultValues?.phone || "",
      address: propsDefaultValues?.address || "",
      email: propsDefaultValues?.email || "",
      logoUrl: propsDefaultValues?.logoUrl || null,
    },
  });

  React.useEffect(() => {
    if (propsDefaultValues) {
      form.reset({
        companyName: propsDefaultValues.companyName || "",
        nit: propsDefaultValues.nit || "",
        phone: propsDefaultValues.phone || "",
        address: propsDefaultValues.address || "",
        email: propsDefaultValues.email || "",
        logoUrl: propsDefaultValues.logoUrl || null,
      });
    } else {
      form.reset({
        companyName: "",
        nit: "",
        phone: "",
        address: "",
        email: "",
        logoUrl: null,
      });
    }
  }, [propsDefaultValues, form.reset]);

  const handleFormSubmit = async (data: CompanyProfileFormData) => {
    await onSubmit(data);
  };

  const currentLogoUrl = form.watch("logoUrl");

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
            {isEditing && currentLogoUrl && (
              <div className="mb-4 flex flex-col items-center">
                <FormLabel className="text-foreground/80 mb-2">Logo Actual</FormLabel>
                <Image
                  src={currentLogoUrl}
                  alt="Logo actual de la empresa"
                  width={100}
                  height={100}
                  className="rounded-md border object-contain"
                  data-ai-hint="logo company"
                />
              </div>
            )}
            {/* El campo de subida de archivo se añadirá en un futuro PR */}
            {/* Por ahora, logoUrl se maneja internamente si ya existe */}

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
