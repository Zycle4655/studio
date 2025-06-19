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
import { ForgotPasswordSchema, type ForgotPasswordFormData } from "@/schemas/auth";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function ForgotPasswordForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    // Mock forgot password
    console.log("Forgot password data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Enlace Enviado",
      description: "Si existe una cuenta con este correo, recibirá un enlace para restablecer su contraseña.",
    });
    // For demo, redirect to a mock reset page or login
    // router.push("/reset-password?email=" + data.email); // Or simply back to login
    router.push("/login");
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary font-headline">Restablecer Contraseña</CardTitle>
        <CardDescription className="text-center">
          Ingrese su correo electrónico para recibir un enlace de restablecimiento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Correo Electrónico</FormLabel>
                   <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="su.correo@ejemplo.com" 
                        {...field} 
                        className="pl-10"
                        aria-label="Correo Electrónico para restablecer contraseña"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enviando..." : "Enviar Enlace"}
              <ArrowRight className="ml-2 h-5 w-5" />
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
