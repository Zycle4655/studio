
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
import { RegisterSchema, type RegisterFormData } from "@/schemas/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormData) {
    form.clearErrors();
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Registro Exitoso",
        description: "Su cuenta ha sido creada. Por favor complete el perfil de su empresa.",
      });
      router.push("/profile-setup"); 
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Ocurrió un error durante el registro.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso.";
        form.setError("email", { type: "manual", message: errorMessage });
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El formato del correo electrónico no es válido.";
        form.setError("email", { type: "manual", message: errorMessage });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil.";
        form.setError("password", { type: "manual", message: errorMessage });
      } else {
         form.setError("email", { type: "manual", message: " " });
         form.setError("password", { type: "manual", message: errorMessage });
      }
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: errorMessage,
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary font-headline">Crear Cuenta</CardTitle>
        <CardDescription className="text-center">
          Únase a ZYCLE y comience a gestionar sus materiales.
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
                        aria-label="Correo Electrónico para registro"
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
                        aria-label="Contraseña para registro"
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
                  <FormLabel className="text-foreground/80">Confirmar Contraseña</FormLabel>
                  <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="pl-10"
                        aria-label="Confirmar Contraseña"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registrando..." : "Registrarse"}
              <UserPlus className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tiene una cuenta?{" "}
          <Link href="/login" passHref className="font-semibold text-primary hover:underline">
            Inicie sesión aquí
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
