"use client";

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
import { ResetPasswordSchema, type ResetPasswordFormData } from "@/schemas/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // In a real app, the token would come from the URL and be validated.
  const token = searchParams.get("token"); 
  
  // Effect to check for token (mock)
  useEffect(() => {
    if (!token) {
        // toast({
        //     variant: "destructive",
        //     title: "Enlace Inválido",
        //     description: "El enlace para restablecer la contraseña no es válido o ha expirado.",
        // });
        // For demo, let's assume a token is always present if on this page.
        console.log("No token found, but proceeding for demo purposes.");
    }
  }, [token, router, toast]);


  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    // Mock password reset
    console.log("Reset password data:", data, "Token:", token);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Contraseña Restablecida",
      description: "Su contraseña ha sido actualizada. Ahora puede iniciar sesión.",
    });
    router.push("/login");
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary font-headline">Establecer Nueva Contraseña</CardTitle>
        <CardDescription className="text-center">
          Ingrese su nueva contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Nueva Contraseña</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="pl-10"
                        aria-label="Nueva Contraseña"
                      />
                    </FormControl>
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
                  <FormLabel className="text-foreground/80">Confirmar Nueva Contraseña</FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="pl-10"
                        aria-label="Confirmar Nueva Contraseña"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
              <RefreshCw className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
         <Link href="/login" passHref className="text-sm text-primary hover:underline font-medium">
            Volver a Iniciar Sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
