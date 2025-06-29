
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, ArrowRight, ArrowLeft, LogIn, LogOut, DollarSign, Scale, Calculator, Info, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, Timestamp, arrayUnion, increment } from "firebase/firestore";
import { AbrirCajaFormSchema, CerrarCajaFormSchema, IngresoCajaFormSchema, type AbrirCajaFormData, type CerrarCajaFormData, type IngresoCajaFormData, type CajaDiariaDocument } from "@/schemas/caja";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { FacturaVentaDocument } from "@/schemas/venta";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type CajaState = 'loading' | 'no_abierta' | 'abierta' | 'cerrada';
type CajaData = CajaDiariaDocument;

export default function ArqueoCajaPage() {
  const { user, companyOwnerId, permissions } = useAuth();
  const { toast } = useToast();
  const [cajaState, setCajaState] = React.useState<CajaState>('loading');
  const [cajaData, setCajaData] = React.useState<CajaData | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getTodayId = React.useCallback(() => new Date().toISOString().split('T')[0], []);
  
  const abrirCajaForm = useForm<AbrirCajaFormData>({
    resolver: zodResolver(AbrirCajaFormSchema),
    defaultValues: { baseInicial: 0 },
  });

  const cerrarCajaForm = useForm<CerrarCajaFormData>({
    resolver: zodResolver(CerrarCajaFormSchema),
    defaultValues: { saldoReal: 0, observaciones: "" },
  });
  
  const ingresoCajaForm = useForm<IngresoCajaFormData>({
    resolver: zodResolver(IngresoCajaFormSchema),
    defaultValues: { monto: undefined },
  });

  const fetchCajaData = React.useCallback(async () => {
    if (!companyOwnerId) return;
    setCajaState('loading');
    const todayId = getTodayId();
    const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);

    try {
      const docSnap = await getDoc(cajaRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as CajaData;
        
        if (data.estado === 'Abierta') {
          // Fetch transactions for today
          const todayStart = new Date(todayId);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(todayId);
          todayEnd.setHours(23, 59, 59, 999);
          
          const comprasRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
          const ventasRef = collection(db, "companyProfiles", companyOwnerId, "saleInvoices");
          
          const comprasQuery = query(comprasRef, where("fecha", ">=", todayStart), where("fecha", "<=", todayEnd));
          const ventasQuery = query(ventasRef, where("fecha", ">=", todayStart), where("fecha", "<=", todayEnd));

          const [comprasSnap, ventasSnap] = await Promise.all([getDocs(comprasQuery), getDocs(ventasQuery)]);

          const totalCompras = comprasSnap.docs
            .map(doc => doc.data() as FacturaCompraDocument)
            .filter(doc => doc.formaDePago === 'efectivo')
            .reduce((sum, doc) => sum + doc.netoPagado, 0);
            
          const totalVentas = ventasSnap.docs
            .map(doc => doc.data() as FacturaVentaDocument)
            .filter(doc => doc.formaDePago === 'efectivo')
            .reduce((sum, doc) => sum + doc.totalFactura, 0);

          const saldoEsperado = data.baseInicial + totalVentas + (data.totalIngresosAdicionales || 0) - totalCompras;
          
          setCajaData({ ...data, totalComprasEfectivo: totalCompras, totalVentasEfectivo: totalVentas, saldoEsperado });
          cerrarCajaForm.setValue('saldoReal', saldoEsperado);
          setCajaState('abierta');

        } else { // estado === 'Cerrada'
          setCajaData(data);
          setCajaState('cerrada');
        }

      } else {
        setCajaState('no_abierta');
        setCajaData(null);
      }
    } catch (error) {
        console.error("Error fetching cash box data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el estado de la caja." });
        setCajaState('no_abierta');
    }
  }, [companyOwnerId, getTodayId, toast, cerrarCajaForm]);
  
  React.useEffect(() => {
    document.title = 'Arqueo de Caja | ZYCLE';
    if (companyOwnerId && permissions?.contabilidad) {
      fetchCajaData();
    } else {
        setCajaState('loading');
    }
  }, [companyOwnerId, permissions, fetchCajaData]);


  const handleAbrirCaja = async (data: AbrirCajaFormData) => {
    if (!companyOwnerId || !user) return;
    setIsSubmitting(true);
    const todayId = getTodayId();
    const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", todayId);

    const nuevaCaja: Omit<CajaDiariaDocument, 'id'> = {
        fecha: Timestamp.now(),
        baseInicial: data.baseInicial,
        totalComprasEfectivo: 0,
        totalVentasEfectivo: 0,
        totalIngresosAdicionales: 0,
        ingresosAdicionales: [],
        saldoEsperado: data.baseInicial,
        saldoReal: null,
        diferencia: null,
        estado: 'Abierta',
        observaciones: null,
        abiertoPor: { uid: user.uid, email: user.email },
        cerradoPor: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    try {
        await setDoc(cajaRef, nuevaCaja);
        toast({ title: "Caja Abierta", description: `La caja se abrió con una base de ${formatCurrency(data.baseInicial)}.` });
        await fetchCajaData();
    } catch (error) {
        console.error("Error opening cash box:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo abrir la caja." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCerrarCaja = async (data: CerrarCajaFormData) => {
    if (!companyOwnerId || !user || !cajaData) return;
    setIsSubmitting(true);

    const diferencia = data.saldoReal - cajaData.saldoEsperado;
    const updateData = {
        estado: 'Cerrada',
        saldoReal: data.saldoReal,
        diferencia: diferencia,
        observaciones: data.observaciones || null,
        cerradoPor: { uid: user.uid, email: user.email },
        updatedAt: Timestamp.now(),
    };

    const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", getTodayId());

    try {
        await updateDoc(cajaRef, updateData);
        toast({ title: "Caja Cerrada", description: `La caja del día ha sido cerrada. Diferencia: ${formatCurrency(diferencia)}.` });
        await fetchCajaData();
    } catch (error) {
        console.error("Error closing cash box:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cerrar la caja." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleIngresoCaja = async (data: IngresoCajaFormData) => {
    if (!companyOwnerId || !user) return;
    setIsSubmitting(true);

    const nuevoIngreso = {
        monto: data.monto,
        observacion: "Ingreso manual",
        fecha: Timestamp.now(),
        registradoPor: { uid: user.uid, email: user.email },
    };

    const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", getTodayId());

    try {
        await updateDoc(cajaRef, {
            ingresosAdicionales: arrayUnion(nuevoIngreso),
            totalIngresosAdicionales: increment(data.monto)
        });
        toast({ title: "Ingreso Registrado", description: `Se agregaron ${formatCurrency(data.monto)} a la caja.` });
        ingresoCajaForm.reset();
        await fetchCajaData();
    } catch (error) {
        console.error("Error adding cash:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el ingreso." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$ --";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  if (!permissions?.contabilidad) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary flex items-center"><Landmark className="mr-3 h-7 w-7" />Arqueo de Caja</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12"><p>No tiene permiso para acceder a esta sección.</p></CardContent>
            </Card>
        </div>
    );
  }

  if (cajaState === 'loading') {
    return (
        <div className="container py-8 px-4 md:px-6"><Skeleton className="h-[400px] w-full" /></div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Landmark className="mr-3 h-7 w-7" />
            Arqueo de Caja - {format(new Date(), "eeee, d 'de' MMMM", { locale: es })}
          </CardTitle>
          <CardDescription>
            Gestione el flujo de efectivo diario de su operación.
          </CardDescription>
        </CardHeader>

        {cajaState === 'no_abierta' && (
          <CardContent>
            <Form {...abrirCajaForm}>
                <form onSubmit={abrirCajaForm.handleSubmit(handleAbrirCaja)} className="space-y-4 max-w-sm mx-auto text-center py-8">
                     <CardTitle>Abrir Caja</CardTitle>
                     <CardDescription>Ingrese la base inicial para empezar el día.</CardDescription>
                     <FormField
                        control={abrirCajaForm.control}
                        name="baseInicial"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Base Inicial</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input type="number" placeholder="Base en efectivo" {...field} className="pl-10 text-lg text-center h-12" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Abriendo..." : <><LogIn className="mr-2 h-5 w-5" /> Abrir Caja</>}
                    </Button>
                </form>
            </Form>
          </CardContent>
        )}
        
        {cajaState === 'cerrada' && cajaData && (
             <CardContent className="text-center py-8">
                <CardTitle className="mb-4">Caja del Día Cerrada</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                     <InfoCard title="Saldo Esperado" value={formatCurrency(cajaData.saldoEsperado)} icon={<Scale />}/>
                     <InfoCard title="Saldo Real Reportado" value={formatCurrency(cajaData.saldoReal)} icon={<DollarSign />}/>
                      <InfoCard title="Ingresos Adicionales" value={formatCurrency(cajaData.totalIngresosAdicionales)} icon={<PlusCircle />}/>
                     <InfoCard title="Diferencia" value={formatCurrency(cajaData.diferencia)} status={cajaData.diferencia === 0 ? 'ok' : 'warn'} icon={<Calculator />}/>
                </div>
                 {cajaData.observaciones && (
                     <div className="mt-6 text-left p-4 bg-muted rounded-md">
                        <h4 className="font-semibold text-sm mb-1">Observaciones del Cierre:</h4>
                        <p className="text-sm text-muted-foreground">{cajaData.observaciones}</p>
                     </div>
                 )}
            </CardContent>
        )}

        {cajaState === 'abierta' && cajaData && (
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <InfoCard title="Base Inicial" value={formatCurrency(cajaData.baseInicial)} icon={<LogIn />}/>
                <InfoCard title="Total Compras (Efectivo)" value={formatCurrency(cajaData.totalComprasEfectivo)} icon={<ArrowRight className="text-red-500" />}/>
                <InfoCard title="Total Ventas (Efectivo)" value={formatCurrency(cajaData.totalVentasEfectivo)} icon={<ArrowLeft className="text-green-500" />}/>
                <InfoCard title="Ingresos Adicionales" value={formatCurrency(cajaData.totalIngresosAdicionales)} icon={<PlusCircle className="text-blue-500" />}/>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-primary flex items-center gap-2"><Scale/> Saldo Esperado en Caja</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-extrabold text-primary">{formatCurrency(cajaData.saldoEsperado)}</p>
                    </CardContent>
                </Card>
            </div>
             <div className="space-y-6">
                <Form {...cerrarCajaForm}>
                    <form onSubmit={cerrarCajaForm.handleSubmit(handleCerrarCaja)} className="space-y-4 p-4 border rounded-lg shadow-inner bg-muted/50">
                        <CardTitle className="text-xl">Cerrar Caja</CardTitle>
                        <FormField
                            control={cerrarCajaForm.control}
                            name="saldoReal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Saldo Real Contado (Efectivo)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input type="number" {...field} className="pl-10 text-lg h-12" />
                                        </div>
                                    </FormControl>
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
                                    <FormControl>
                                        <Textarea placeholder="Notas sobre faltantes, sobrantes, etc." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-destructive hover:bg-destructive/90">
                            {isSubmitting ? "Cerrando..." : <><LogOut className="mr-2 h-5 w-5" /> Cerrar Caja del Día</>}
                        </Button>
                    </form>
                </Form>
                {/* Add Cash Form */}
                <Form {...ingresoCajaForm}>
                    <form onSubmit={ingresoCajaForm.handleSubmit(handleIngresoCaja)} className="space-y-4 p-4 border rounded-lg shadow-inner bg-muted/50">
                        <CardTitle className="text-xl">Agregar Dinero a Caja</CardTitle>
                        <FormField
                            control={ingresoCajaForm.control}
                            name="monto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto a Ingresar</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input type="number" {...field} className="pl-10 text-lg h-12" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? "Agregando..." : <><PlusCircle className="mr-2 h-5 w-5" /> Agregar a Caja</>}
                        </Button>
                    </form>
                </Form>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}


function InfoCard({ title, value, icon, status }: { title: string, value: string, icon: React.ReactNode, status?: 'ok' | 'warn' }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <span className="text-muted-foreground">{icon}</span>
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", status === 'warn' && 'text-destructive')}>{value}</div>
            </CardContent>
        </Card>
    )
}

    
