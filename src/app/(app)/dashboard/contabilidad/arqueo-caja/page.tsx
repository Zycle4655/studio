
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AbrirCajaFormSchema, type AbrirCajaFormData, type CajaDiariaDocument } from "@/schemas/caja";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, PiggyBank, CheckCircle } from "lucide-react";

// Helper to get date in YYYY-MM-DD format for document ID
const getTodayDateId = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ArqueoCajaPage() {
  const { user, companyOwnerId, permissions, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [cajaDiaria, setCajaDiaria] = React.useState<CajaDiariaDocument | null>(null);
  const [isPageLoading, setIsPageLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isOwner = !authLoading && user?.uid === companyOwnerId;
  const todayId = getTodayDateId();
  
  const abrirCajaForm = useForm<AbrirCajaFormData>({
    resolver: zodResolver(AbrirCajaFormSchema),
    defaultValues: { baseInicial: 0 },
  });

  const fetchCajaData = React.useCallback(async () => {
    if (!isOwner || !companyOwnerId) {
        setIsPageLoading(false);
        return;
    }
    setIsPageLoading(true);
    try {
        const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
        const cajaSnap = await getDoc(cajaRef);
        const cajaData = cajaSnap.exists() ? (cajaSnap.data() as CajaDiariaDocument) : null;
        setCajaDiaria(cajaData);
    } catch (error) {
        console.error("Error fetching caja data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de la caja." });
    } finally {
        setIsPageLoading(false);
    }
  }, [isOwner, companyOwnerId, todayId, toast]);


  React.useEffect(() => {
    document.title = 'Arqueo de Caja | ZYCLE';
    if (!authLoading) {
      fetchCajaData();
    }
  }, [authLoading, fetchCajaData]);
  
  const handleAbrirCaja = async (data: AbrirCajaFormData) => {
      if (!isOwner || !user?.email || !companyOwnerId) return;
      setIsSubmitting(true);
      try {
        const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
        const nuevaCaja: Partial<CajaDiariaDocument> = {
            id: todayId,
            fecha: Timestamp.now(),
            baseInicial: data.baseInicial,
            estado: 'Abierta',
            abiertoPor: { uid: user.uid, email: user.email },
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
        };
        await setDoc(cajaRef, nuevaCaja);
        toast({ title: "Caja Abierta", description: `La caja para hoy se abrió con una base de ${formatCurrency(data.baseInicial)}.` });
        
        // Refetch data after opening
        const cajaSnap = await getDoc(cajaRef);
        if (cajaSnap.exists()) {
            setCajaDiaria(cajaSnap.data() as CajaDiariaDocument);
        }

      } catch (error) {
        console.error("Error opening caja:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo abrir la caja." });
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  if (authLoading || isPageLoading) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <CardHeader className="px-0">
          <Skeleton className="h-9 w-1/3 mb-2" />
          <Skeleton className="h-5 w-2/3" />
        </CardHeader>
        <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader><Skeleton className="h-8 w-1/2 mx-auto" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }
  
  if (!permissions?.contabilidad || !isOwner) {
    return (
       <div className="container py-8 px-4 md:px-6">
          <Card className="shadow-lg text-center py-12">
            <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
            <CardContent>
              <p>
                { !isOwner 
                  ? "Esta funcionalidad solo está disponible para el administrador principal de la cuenta."
                  : "No tiene los permisos necesarios para acceder a este módulo."
                }
              </p>
            </CardContent>
          </Card>
        </div>
    )
  }
  
  const renderAbrirCaja = () => (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
            <PiggyBank className="mx-auto h-12 w-12 text-primary mb-4"/>
            <CardTitle>Abrir Caja del Día</CardTitle>
            <CardDescription>Para empezar a registrar movimientos, ingrese el monto base de la caja para hoy.</CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...abrirCajaForm}>
                <form onSubmit={abrirCajaForm.handleSubmit(handleAbrirCaja)} className="flex flex-col sm:flex-row items-start gap-4">
                    <FormField
                        control={abrirCajaForm.control}
                        name="baseInicial"
                        render={({ field }) => (
                            <FormItem className="flex-1 w-full">
                                <FormLabel>Base Inicial (COP)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ej: 500000" {...field} disabled={isSubmitting}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto mt-auto">
                        {isSubmitting ? "Abriendo..." : "Abrir Caja"}
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
  );

  const renderCajaAbierta = () => (
    <Card className="max-w-2xl mx-auto shadow-lg bg-green-50 border-green-200">
        <CardHeader className="text-center">
           <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4"/>
           <CardTitle className="text-green-800">Caja del Día Abierta</CardTitle>
           <CardDescription className="text-green-700">La caja para el {cajaDiaria?.id} ya está operativa.</CardDescription>
       </CardHeader>
       <CardContent className="text-center">
            <p className="text-muted-foreground">Base Inicial Registrada:</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(cajaDiaria!.baseInicial)}</p>
       </CardContent>
     </Card>
  );


  return (
    <div className="container py-8 px-4 md:px-6">
       <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary mb-2 font-headline flex items-center">
                <Landmark className="mr-3 h-8 w-8"/> Arqueo de Caja
            </h1>
            <p className="text-lg text-muted-foreground">Gestione el estado diario de su caja.</p>
        </div>

        {!cajaDiaria ? renderAbrirCaja() : renderCajaAbierta()}
    </div>
  );
}
