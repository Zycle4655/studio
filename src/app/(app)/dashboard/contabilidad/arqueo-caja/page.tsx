
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AbrirCajaFormSchema, type AbrirCajaFormData, CerrarCajaFormSchema, type CerrarCajaFormData, type CajaDiariaDocument } from "@/schemas/caja";
import { type FacturaCompraDocument } from "@/schemas/compra";
import { type FacturaVentaDocument } from "@/schemas/venta";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, ArrowDownCircle, ArrowUpCircle, Scale, Calculator, CheckCircle, AlertTriangle, PiggyBank, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to get date in YYYY-MM-DD format for document ID
const getTodayDateId = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ArqueoCajaPage() {
  const { user, companyOwnerId, permissions } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.uid === companyOwnerId;

  const [cajaDiaria, setCajaDiaria] = React.useState<CajaDiariaDocument | null>(null);
  const [totalCompras, setTotalCompras] = React.useState(0);
  const [totalVentas, setTotalVentas] = React.useState(0);
  const [saldoEsperado, setSaldoEsperado] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const todayId = getTodayDateId();
  
  const abrirCajaForm = useForm<AbrirCajaFormData>({
    resolver: zodResolver(AbrirCajaFormSchema),
    defaultValues: { baseInicial: 0 },
  });

  const cerrarCajaForm = useForm<CerrarCajaFormData>({
    resolver: zodResolver(CerrarCajaFormSchema),
    defaultValues: { saldoReal: 0, observaciones: "" },
  });


  const fetchData = React.useCallback(async () => {
    if (!companyOwnerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
      const cajaSnap = await getDoc(cajaRef);
      const cajaData = cajaSnap.exists() ? (cajaSnap.data() as CajaDiariaDocument) : null;
      setCajaDiaria(cajaData);

      if (cajaData && cajaData.estado === 'Abierta') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch Compras
        const comprasRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
        const qCompras = query(comprasRef, 
            where("fecha", ">=", Timestamp.fromDate(startOfDay)), 
            where("fecha", "<=", Timestamp.fromDate(endOfDay)),
            where("formaDePago", "==", "efectivo")
        );
        const comprasSnap = await getDocs(qCompras);
        const totalComprasSum = comprasSnap.docs.reduce((sum, doc) => sum + (doc.data() as FacturaCompraDocument).netoPagado, 0);
        setTotalCompras(totalComprasSum);
        
        // Fetch Ventas
        const ventasRef = collection(db, "companyProfiles", companyOwnerId, "saleInvoices");
        const qVentas = query(ventasRef, 
            where("fecha", ">=", Timestamp.fromDate(startOfDay)), 
            where("fecha", "<=", Timestamp.fromDate(endOfDay)),
            where("formaDePago", "==", "efectivo")
        );
        const ventasSnap = await getDocs(qVentas);
        const totalVentasSum = ventasSnap.docs.reduce((sum, doc) => sum + (doc.data() as FacturaVentaDocument).totalFactura, 0);
        setTotalVentas(totalVentasSum);

        setSaldoEsperado(cajaData.baseInicial - totalComprasSum + totalVentasSum);
      }
    } catch (error) {
      console.error("Error fetching caja data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de la caja." });
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, todayId, toast]);

  React.useEffect(() => {
    document.title = 'Arqueo de Caja | ZYCLE';
    // This check is now more robust. It ensures companyOwnerId is loaded
    // before making a decision, preventing race conditions on initial render.
    if (companyOwnerId) { // Only proceed if we know who the owner is.
      if (user?.uid === companyOwnerId) { // Check if the current user is the owner.
        fetchData();
      } else {
        // If the user is not the owner, we know they don't have permission.
        // Stop loading and let the UI show the restricted access message.
        setIsLoading(false);
      }
    }
    // If companyOwnerId is not yet loaded, this effect does nothing and will re-run when it is.
  }, [companyOwnerId, user, fetchData]);
  
  const handleAbrirCaja = async (data: AbrirCajaFormData) => {
      if (!companyOwnerId || !user || !user.email) return;
      setIsSubmitting(true);
      try {
        const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
        const nuevaCaja: CajaDiariaDocument = {
            id: todayId,
            fecha: Timestamp.now(),
            baseInicial: data.baseInicial,
            totalComprasEfectivo: 0,
            totalVentasEfectivo: 0,
            saldoEsperado: data.baseInicial,
            saldoReal: 0,
            diferencia: 0,
            estado: 'Abierta',
            abiertoPor: { uid: user.uid, email: user.email },
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
        };
        await setDoc(cajaRef, nuevaCaja);
        toast({ title: "Caja Abierta", description: `La caja para hoy se abrió con una base de ${formatCurrency(data.baseInicial)}.` });
        fetchData(); // Refresh data
      } catch (error) {
        console.error("Error opening caja:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo abrir la caja." });
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const handleCerrarCaja = async (data: CerrarCajaFormData) => {
    if (!companyOwnerId || !user || !user.email || !cajaDiaria) return;
    setIsSubmitting(true);
    try {
        const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);
        const diferencia = data.saldoReal - saldoEsperado;

        await setDoc(cajaRef, {
            ...cajaDiaria,
            estado: 'Cerrada',
            saldoReal: data.saldoReal,
            diferencia: diferencia,
            observaciones: data.observaciones || null,
            totalComprasEfectivo: totalCompras,
            totalVentasEfectivo: totalVentas,
            saldoEsperado: saldoEsperado,
            cerradoPor: { uid: user.uid, email: user.email },
            updatedAt: serverTimestamp(),
        }, { merge: true });

        toast({ title: "Caja Cerrada", description: `El arqueo de caja se ha completado. Diferencia: ${formatCurrency(diferencia)}` });
        fetchData(); // Refresh data
    } catch(error) {
         console.error("Error closing caja:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cerrar la caja." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const renderLoadingState = () => (
     <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
         <Skeleton className="h-48 w-full" />
    </div>
  );

  if (isLoading) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <CardHeader className="px-0">
          <Skeleton className="h-9 w-1/3 mb-2" />
          <Skeleton className="h-5 w-2/3" />
        </CardHeader>
        {renderLoadingState()}
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
            <CardDescription>Para empezar a registrar compras y ventas en efectivo, ingrese el monto base de la caja para hoy.</CardDescription>
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

  const renderCajaCerrada = () => (
      <Card className="max-w-4xl mx-auto shadow-lg bg-gray-50">
         <CardHeader className="text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-500 mb-4"/>
            <CardTitle>Caja del Día Cerrada</CardTitle>
            <CardDescription>El arqueo para el día {cajaDiaria?.id} ya se ha realizado. Aquí está el resumen.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-white"><CardHeader><CardTitle className="text-sm font-medium">Saldo Esperado</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(cajaDiaria!.saldoEsperado)}</CardContent></Card>
                <Card className="bg-white"><CardHeader><CardTitle className="text-sm font-medium">Saldo Real Contado</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(cajaDiaria!.saldoReal)}</CardContent></Card>
                <Card className={cn("text-white", cajaDiaria!.diferencia === 0 ? "bg-green-600" : "bg-destructive")}>
                    <CardHeader><CardTitle className="text-sm font-medium text-white">Diferencia</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{formatCurrency(cajaDiaria!.diferencia)}</CardContent>
                </Card>
            </div>
            {cajaDiaria!.observaciones && (
                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
                    <h4 className="font-bold text-yellow-800">Observaciones del Cierre</h4>
                    <p className="text-sm text-yellow-700 mt-1">{cajaDiaria!.observaciones}</p>
                </div>
            )}
        </CardContent>
      </Card>
  );

  const renderCajaAbierta = () => (
    <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Base Inicial</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(cajaDiaria!.baseInicial)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ArrowDownCircle className="text-destructive"/>Total Compras (Efectivo)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalCompras)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ArrowUpCircle className="text-green-600"/>Total Ventas (Efectivo)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalVentas)}</div></CardContent></Card>
            <Card className="bg-primary/5 border-primary"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Scale/>Saldo Esperado en Caja</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{formatCurrency(saldoEsperado)}</div></CardContent></Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator/>Realizar Arqueo y Cierre de Caja</CardTitle>
                <CardDescription>Al final del día, cuente el dinero en efectivo y regístrelo aquí para cerrar la caja.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...cerrarCajaForm}>
                   <form onSubmit={cerrarCajaForm.handleSubmit(handleCerrarCaja)} className="space-y-4">
                        <FormField
                            control={cerrarCajaForm.control}
                            name="saldoReal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Saldo Real Contado (COP)</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ingrese el monto contado" {...field} disabled={isSubmitting}/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={cerrarCajaForm.control}
                            name="observaciones"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones (Opcional)</FormLabel>
                                    <FormControl><Textarea placeholder="Añada notas sobre cualquier diferencia encontrada..." {...field} disabled={isSubmitting}/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} variant="destructive">
                            {isSubmitting ? "Cerrando..." : "Cerrar Caja y Guardar Arqueo"}
                        </Button>
                   </form>
                </Form>
            </CardContent>
        </Card>
    </>
  );


  return (
    <div className="container py-8 px-4 md:px-6">
       <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary mb-2 font-headline flex items-center">
                <Landmark className="mr-3 h-8 w-8"/> Arqueo de Caja
            </h1>
            <p className="text-lg text-muted-foreground">Gestione el flujo de caja diario de su operación.</p>
        </div>

        {!cajaDiaria && renderAbrirCaja()}
        {cajaDiaria && cajaDiaria.estado === 'Abierta' && renderCajaAbierta()}
        {cajaDiaria && cajaDiaria.estado === 'Cerrada' && renderCajaCerrada()}
    </div>
  );
}

    