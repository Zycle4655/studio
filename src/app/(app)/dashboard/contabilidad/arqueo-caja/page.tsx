
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, ArrowRight, ArrowLeft, LogIn, LogOut, DollarSign, Scale, Calculator, Info, PlusCircle, Fuel, Ticket, Receipt, ShoppingCart, Banknote } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, Timestamp, arrayUnion, increment } from "firebase/firestore";
import { AbrirCajaFormSchema, CerrarCajaFormSchema, IngresoCajaFormSchema, GastoCajaFormSchema, type AbrirCajaFormData, type CerrarCajaFormData, type IngresoCajaFormData, type GastoCajaFormData, type CajaDiariaDocument, type GastoItem } from "@/schemas/caja";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { FacturaVentaDocument } from "@/schemas/venta";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
    defaultValues: { monto: undefined, observacion: "" },
  });
  
  const gastoForm = useForm<GastoCajaFormData>({
    resolver: zodResolver(GastoCajaFormSchema),
    defaultValues: { monto: undefined, categoria: undefined, observacion: "" },
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
        
        const comprasRef = collection(db, "companyProfiles", companyOwnerId, "purchaseInvoices");
        const ventasRef = collection(db, "companyProfiles", companyOwnerId, "saleInvoices");
        
        const qCompras = query(comprasRef, where("fecha", ">=", Timestamp.fromDate(new Date(todayId + "T00:00:00"))), where("fecha", "<=", Timestamp.fromDate(new Date(todayId + "T23:59:59"))));
        const qVentas = query(ventasRef, where("fecha", ">=", Timestamp.fromDate(new Date(todayId + "T00:00:00"))), where("fecha", "<=", Timestamp.fromDate(new Date(todayId + "T23:59:59"))));
        
        const [comprasSnap, ventasSnap] = await Promise.all([getDocs(qCompras), getDocs(qVentas)]);
        
        const totalCompras = comprasSnap.docs
            .map(d => d.data() as FacturaCompraDocument)
            .filter(d => d.formaDePago === 'efectivo')
            .reduce((sum, d) => sum + d.netoPagado, 0);

        const totalVentas = ventasSnap.docs
            .map(d => d.data() as FacturaVentaDocument)
            .filter(d => d.formaDePago === 'efectivo')
            .reduce((sum, d) => sum + d.totalFactura, 0);
            
        const saldoEsperado = data.baseInicial + totalVentas + data.totalIngresosAdicionales - totalCompras - data.totalGastos;

        const updatedData = { ...data, totalComprasEfectivo: totalCompras, totalVentasEfectivo: totalVentas, saldoEsperado };
        setCajaData(updatedData);
        
        if (data.estado === 'Abierta') {
          cerrarCajaForm.setValue('saldoReal', saldoEsperado);
          setCajaState('abierta');
        } else {
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
    } else if (companyOwnerId && !permissions?.contabilidad) {
        setCajaState('loading'); // Show loading or no-permission state
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
        totalGastos: 0,
        gastos: [],
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
  
  const handleRegistrarIngreso = async (data: IngresoCajaFormData) => {
    if (!companyOwnerId || !user) return;
    setIsSubmitting(true);
    const nuevoIngreso = {
        id: new Date().toISOString(),
        monto: data.monto,
        observacion: data.observacion || null,
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
  
  const handleRegistrarGasto = async (data: GastoCajaFormData) => {
    if (!companyOwnerId || !user) return;
    setIsSubmitting(true);
    const nuevoGasto: GastoItem = {
        id: new Date().toISOString(),
        monto: data.monto,
        categoria: data.categoria,
        observacion: data.observacion || null,
        fecha: Timestamp.now(),
        registradoPor: { uid: user.uid, email: user.email },
    };
    const cajaRef = doc(db, "companyProfiles", companyOwnerId, "cajaDiaria", getTodayId());
    try {
        await updateDoc(cajaRef, {
            gastos: arrayUnion(nuevoGasto),
            totalGastos: increment(data.monto)
        });
        toast({ title: "Gasto Registrado", description: `Se registró un gasto de ${formatCurrency(data.monto)}.` });
        gastoForm.reset();
        await fetchCajaData();
    } catch (error) {
        console.error("Error adding expense:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el gasto." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$ --";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const getExpenseTotalsByCategory = (gastos: GastoItem[] = []) => {
    return gastos.reduce((acc, gasto) => {
        acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.monto;
        return acc;
    }, {} as Record<string, number>);
  };

  if (cajaState === 'loading') {
    return ( <div className="container py-8 px-4 md:px-6"><Skeleton className="h-[400px] w-full" /></div> );
  }

  if (!permissions?.contabilidad) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><Landmark className="mr-3 h-7 w-7" />Arqueo de Caja</CardTitle></CardHeader><CardContent className="text-center py-12"><p>No tiene permiso para acceder a esta sección.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl font-headline text-primary flex items-center">
            <Landmark className="mr-3 h-8 w-8" />
            Arqueo de Caja
          </CardTitle>
          <CardDescription>
            Gestione el flujo de efectivo diario de su operación para el día: {format(new Date(), "eeee, d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>

        {cajaState === 'no_abierta' && (
            <Card className="shadow-lg max-w-sm mx-auto">
                <CardHeader><CardTitle>Abrir Caja</CardTitle><CardDescription>Ingrese la base inicial para empezar el día.</CardDescription></CardHeader>
                <CardContent>
                    <Form {...abrirCajaForm}>
                        <form onSubmit={abrirCajaForm.handleSubmit(handleAbrirCaja)} className="space-y-4">
                            <FormField control={abrirCajaForm.control} name="baseInicial"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="sr-only">Base Inicial</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                <Input type="number" placeholder="Base en efectivo" {...field} className="pl-10 text-lg text-center h-12" />
                                            </div>
                                        </FormControl><FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? "Abriendo..." : <><LogIn className="mr-2 h-5 w-5" /> Abrir Caja</>}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        )}
        
        {cajaState === 'cerrada' && cajaData && (
            <Card className="shadow-lg max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Caja del Día Cerrada</CardTitle>
                    <CardDescription>Resumen final de los movimientos del día.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoCard title="Base Inicial" value={formatCurrency(cajaData.baseInicial)} icon={<LogIn />}/>
                        <InfoCard title="Ventas (Efectivo)" value={formatCurrency(cajaData.totalVentasEfectivo)} icon={<ArrowLeft className="text-green-500"/>}/>
                        <InfoCard title="Compras (Efectivo)" value={formatCurrency(cajaData.totalComprasEfectivo)} icon={<ArrowRight className="text-red-500" />}/>
                        <InfoCard title="Ingresos Adicionales" value={formatCurrency(cajaData.totalIngresosAdicionales)} icon={<PlusCircle className="text-blue-500"/>}/>
                        <InfoCard title="Gastos (Combustible)" value={formatCurrency(getExpenseTotalsByCategory(cajaData.gastos).combustible)} icon={<Fuel className="text-orange-500"/>}/>
                        <InfoCard title="Gastos (Peajes)" value={formatCurrency(getExpenseTotalsByCategory(cajaData.gastos).peajes)} icon={<Ticket className="text-purple-500"/>}/>
                        <InfoCard title="Gastos (Generales)" value={formatCurrency(getExpenseTotalsByCategory(cajaData.gastos).general)} icon={<Receipt className="text-gray-500"/>}/>
                    </div>
                    <Separator/>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <InfoCard title="Saldo Esperado" value={formatCurrency(cajaData.saldoEsperado)} icon={<Scale />} isLarge />
                        <InfoCard title="Saldo Real Reportado" value={formatCurrency(cajaData.saldoReal)} icon={<DollarSign />} isLarge />
                        <InfoCard title="Diferencia" value={formatCurrency(cajaData.diferencia)} status={cajaData.diferencia === 0 ? 'ok' : 'warn'} icon={<Calculator />} isLarge />
                    </div>
                    {cajaData.observaciones && (
                        <div className="mt-6 text-left p-4 bg-muted rounded-md"><h4 className="font-semibold text-sm mb-1">Observaciones del Cierre:</h4><p className="text-sm text-muted-foreground">{cajaData.observaciones}</p></div>
                    )}
                </CardContent>
            </Card>
        )}

        {cajaState === 'abierta' && cajaData && (
          <div className="space-y-6 max-w-4xl mx-auto">
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Estado Actual y Saldos</CardTitle>
                    <CardDescription>Resumen en tiempo real de los movimientos de caja.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoCard title="Base Inicial" value={formatCurrency(cajaData.baseInicial)} icon={<LogIn />}/>
                        <InfoCard title="Ventas (Efectivo)" value={formatCurrency(cajaData.totalVentasEfectivo)} icon={<ArrowLeft className="text-green-500"/>}/>
                        <InfoCard title="Compras (Efectivo)" value={formatCurrency(cajaData.totalComprasEfectivo)} icon={<ArrowRight className="text-red-500" />}/>
                        <InfoCard title="Ingresos Adicionales" value={formatCurrency(cajaData.totalIngresosAdicionales)} icon={<PlusCircle className="text-blue-500" />}/>
                        <InfoCard title="Total Gastos" value={formatCurrency(cajaData.totalGastos)} icon={<ShoppingCart className="text-orange-500" />}/>
                    </div>
                    <Card className="bg-primary/5 border-primary/20 text-center py-4">
                        <CardHeader className="p-0 pb-2"><CardTitle className="text-lg font-bold text-primary flex items-center justify-center gap-2"><Scale/> Saldo Esperado en Caja</CardTitle></CardHeader>
                        <CardContent className="p-0"><p className="text-4xl font-extrabold text-primary">{formatCurrency(cajaData.saldoEsperado)}</p></CardContent>
                    </Card>
                </CardContent>
             </Card>

            <Card className="shadow-lg">
                <CardHeader><CardTitle>Registrar Movimientos</CardTitle><CardDescription>Añada ingresos o gastos a la caja actual.</CardDescription></CardHeader>
                <CardContent>
                    <Tabs defaultValue="gasto">
                        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="ingreso">Registrar Ingreso</TabsTrigger><TabsTrigger value="gasto">Registrar Gasto</TabsTrigger></TabsList>
                        <TabsContent value="ingreso" className="pt-4">
                            <Form {...ingresoCajaForm}><form onSubmit={ingresoCajaForm.handleSubmit(handleRegistrarIngreso)} className="space-y-4">
                                <FormField control={ingresoCajaForm.control} name="monto" render={({ field }) => (<FormItem><FormLabel>Monto a Ingresar</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={ingresoCajaForm.control} name="observacion" render={({ field }) => (<FormItem><FormLabel>Observación (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Abono de..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="submit" disabled={isSubmitting} className="w-full"><Banknote className="mr-2 h-4 w-4"/> Agregar a Caja</Button>
                            </form></Form>
                        </TabsContent>
                        <TabsContent value="gasto" className="pt-4">
                            <Form {...gastoForm}><form onSubmit={gastoForm.handleSubmit(handleRegistrarGasto)} className="space-y-4">
                                <FormField control={gastoForm.control} name="monto" render={({ field }) => (<FormItem><FormLabel>Monto del Gasto</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={gastoForm.control} name="categoria" render={({ field }) => (<FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una categoría..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="combustible">Combustible</SelectItem><SelectItem value="peajes">Peajes</SelectItem><SelectItem value="general">Gasto General</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={gastoForm.control} name="observacion" render={({ field }) => (<FormItem><FormLabel>Observación (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Gasolina para vehículo ABC-123" {...field} value={field.value ?? ""}/></FormControl><FormMessage /></FormItem>)} />
                                <Button type="submit" disabled={isSubmitting} className="w-full"><ShoppingCart className="mr-2 h-4 w-4"/> Registrar Gasto</Button>
                            </form></Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

             <Card className="shadow-lg">
                <CardHeader><CardTitle>Cerrar Caja del Día</CardTitle><CardDescription>Realice el conteo final y cierre la operación del día.</CardDescription></CardHeader>
                <CardContent>
                    <Form {...cerrarCajaForm}><form onSubmit={cerrarCajaForm.handleSubmit(handleCerrarCaja)} className="space-y-4">
                        <FormField control={cerrarCajaForm.control} name="saldoReal" render={({ field }) => (<FormItem><FormLabel>Saldo Real Contado (Efectivo)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="number" {...field} className="pl-10 text-lg h-12" /></div></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={cerrarCajaForm.control} name="observaciones" render={({ field }) => (<FormItem><FormLabel>Observaciones (Opcional)</FormLabel><FormControl><Textarea placeholder="Notas sobre faltantes, sobrantes, etc." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-destructive hover:bg-destructive/90">{isSubmitting ? "Cerrando..." : <><LogOut className="mr-2 h-5 w-5" /> Cerrar Caja Definitivamente</>}</Button>
                    </form></Form>
                </CardContent>
             </Card>
          </div>
        )}
      </div>
  );
}


function InfoCard({ title, value, icon, status, isLarge = false }: { title: string, value: string, icon: React.ReactNode, status?: 'ok' | 'warn', isLarge?: boolean }) {
    return (
        <Card className={cn(isLarge && "py-4")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", isLarge && "text-base")}>{title}</CardTitle>
                <span className="text-muted-foreground">{icon}</span>
            </CardHeader>
            <CardContent>
                <div className={cn("font-bold", isLarge ? "text-3xl" : "text-2xl", status === 'warn' && 'text-destructive', status === 'ok' && 'text-green-600')}>{value}</div>
            </CardContent>
        </Card>
    )
}
