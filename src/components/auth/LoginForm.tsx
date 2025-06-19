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
import { LoginSchema, type LoginFormData } from "@/schemas/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    // Mock login
    console.log("Login data:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (data.email === "test@example.com" && data.password === "password") {
      localStorage.setItem("isLoggedInZycle", "true"); // Mock session
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de nuevo!",
      });
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Error de Inicio de Sesión",
        description: "Correo electrónico o contraseña incorrectos.",
      });
      form.setError("email", { type: "manual", message: " " }); // Clear previous specific errors but mark as error
      form.setError("password", { type: "manual", message: "Correo electrónico o contraseña incorrectos." });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary font-headline">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center">
          Acceda a su cuenta ZYCLE.
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
                        aria-label="Correo Electrónico"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Contraseña</FormLabel>
                   <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="pl-10"
                        aria-label="Contraseña"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Ingresando..." : "Ingresar"}
              <LogIn className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-4">
        <Link href="/forgot-password" passHref className="text-sm text-primary hover:underline font-medium">
            ¿Olvidó su contraseña?
        </Link>
        <p className="text-sm text-muted-foreground">
          ¿No tiene una cuenta?{" "}
          <Link href="/register" passHref className="font-semibold text-primary hover:underline">
            Regístrese aquí
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
