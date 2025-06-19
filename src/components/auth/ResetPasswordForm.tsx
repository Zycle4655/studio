
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
import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("oobCode");
    if (code) {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then((email) => {
          console.log("Token valid for email:", email);
          setIsValidToken(true);
        })
        .catch((error) => {
          console.error("Invalid or expired oobCode:", error);
          toast({
            variant: "destructive",
            title: "Enlace Inválido",
            description: "El enlace para restablecer la contraseña no es válido o ha expirado. Por favor, solicite uno nuevo.",
          });
          setIsValidToken(false);
          router.replace("/forgot-password");
        })
        .finally(() => {
          setIsVerifyingToken(false);
        });
    } else {
      toast({
          variant: "destructive",
          title: "Enlace Inválido",
          description: "No se encontró el código de restablecimiento. Por favor, solicite un enlace nuevo.",
      });
      setIsVerifyingToken(false);
      setIsValidToken(false);
      router.replace("/forgot-password");
    }
  }, [searchParams, router, toast]);


  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    if (!oobCode || !isValidToken) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se puede restablecer la contraseña. El enlace no es válido.",
      });
      return;
    }
    form.clearErrors();
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      toast({
        title: "Contraseña Restablecida",
        description: "Su contraseña ha sido actualizada. Ahora puede iniciar sesión.",
      });
      router.push("/login");
    } catch (error: any) {
        console.error("Reset password error:", error);
        let errorMessage = "Ocurrió un error al restablecer la contraseña.";
        if (error.code === 'auth/expired-action-code') {
            errorMessage = "El enlace ha expirado. Por favor, solicite uno nuevo.";
        } else if (error.code === 'auth/invalid-action-code') {
            errorMessage = "El enlace no es válido. Por favor, solicite uno nuevo.";
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = "Esta cuenta ha sido deshabilitada.";
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = "No se encontró una cuenta para este enlace.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "La nueva contraseña es demasiado débil.";
            form.setError("password", { type: "manual", message: errorMessage });
        }
         toast({
            variant: "destructive",
            title: "Error al Restablecer",
            description: errorMessage,
        });
    }
  }

  if (isVerifyingToken) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center text-primary font-headline">Verificando Enlace...</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">Por favor espere mientras verificamos la validez de su enlace de restablecimiento.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!isValidToken && !isVerifyingToken) {
     // Toast has already been shown, router.replace will handle redirect
     return null;
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !isValidToken}>
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
