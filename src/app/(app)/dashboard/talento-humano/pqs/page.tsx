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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PQSFormSchema, type PQSFormData, type PQSEmailInput } from "@/schemas/pqs";
import { sendPQS } from "@/ai/flows/send-pqs-email-flow";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareQuote, Send } from "lucide-react";

export default function PQSPage() {
  const { user, collaboratorName, companyProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    document.title = 'Peticiones, Quejas y Sugerencias | ZYCLE';
  }, []);

  const form = useForm<PQSFormData>({
    resolver: zodResolver(PQSFormSchema),
    defaultValues: {
      asunto: "",
      mensaje: "",
    },
  });

  async function onSubmit(data: PQSFormData) {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "No se pudo identificar al usuario. Por favor, vuelva a iniciar sesión.",
        });
        return;
    }
    
    const companyEmail = companyProfile?.email;
    if (!companyEmail) {
         toast({
            variant: "destructive",
            title: "Correo de Empresa no Configurado",
            description: "El administrador no ha configurado un correo de contacto para la empresa en el perfil.",
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const input: PQSEmailInput = {
        collaboratorName: collaboratorName || user.displayName || "Colaborador Anónimo",
        collaboratorEmail: user.email || "desconocido@zycle.local",
        subject: data.asunto,
        message: data.mensaje,
        companyEmail: companyEmail,
      };

      const result = await sendPQS(input);
      
      if (result.success) {
        toast({
          title: "PQS Enviada Exitosamente",
          description: "Su mensaje ha sido enviado al administrador. Recibirá una respuesta a su debido tiempo.",
        });
        form.reset();
      } else {
        throw new Error("El flujo de envío de PQS falló.");
      }

    } catch (error) {
      console.error("Error submitting PQS:", error);
      toast({
        variant: "destructive",
        title: "Error al Enviar",
        description: "No se pudo enviar su PQS. Por favor, intente de nuevo más tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <MessageSquareQuote className="mr-3 h-7 w-7" />
            Peticiones, Quejas y Sugerencias
          </CardTitle>
          <CardDescription>
            Use este formulario para enviar sus comentarios. Su nombre y correo se adjuntarán para poder darle seguimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="asunto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Sugerencia para el área de bodega" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mensaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa aquí su petición, queja o sugerencia de la forma más detallada posible..."
                        rows={10}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : <> <Send className="mr-2 h-4 w-4" /> Enviar Mensaje </>}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
