
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, BarChart3, CheckCircle2, DollarSign, Package, ShieldCheck, TrendingUp, Users, Warehouse, FileSpreadsheet, HandCoins, Truck, MapPin, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MarketingPage() {

  const plans = [
    {
      name: "Esencial",
      price: "Ideal para iniciar",
      description: "Controla tus operaciones básicas y digitaliza tu inventario.",
      features: [
        "Gestión de Compras y Ventas",
        "Catálogo de Materiales",
        "Inventario en Tiempo Real",
        "Gestión de Flota de Transporte",
        "Arqueo de Caja Diario",
        "Hasta 3 usuarios",
      ],
      cta: "Comienza Ahora",
      variant: "outline"
    },
    {
      name: "Profesional",
      price: "El más popular",
      description: "Para ECAs en crecimiento que buscan herramientas avanzadas y cumplimiento normativo.",
      features: [
        "Todo lo del Plan Esencial",
        "Gestión de Equipo y Permisos",
        "Control de Asistencia por QR",
        "Gestión de Préstamos y Abonos",
        "Exportación de Datos a Excel",
        "Generador de Reportes SUI",
        "Certificados de Aprovechamiento",
        "Hasta 10 usuarios",
      ],
      cta: "Elige Profesional",
      variant: "default"
    },
    {
      name: "Corporativo",
      price: "A tu medida",
      description: "La solución definitiva para operaciones a gran escala con necesidades personalizadas.",
      features: [
        "Todo lo del Plan Profesional",
        "Usuarios ilimitados",
        "Soporte Prioritario",
        "Acceso anticipado a módulos IA",
        "Opciones de API e Integración",
        "Marca Blanca (Opcional)",
      ],
      cta: "Contáctanos",
      variant: "outline"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary font-headline">Zycle</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-base">
            <Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
            <Link href="#plans" className="hover:text-primary transition-colors">Planes</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-base">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild size="lg" className="text-base hidden sm:flex">
              <Link href="/register">Regístrate Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 text-center">
          <div className="container">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary font-headline animate-fade-in">
              La Plataforma Definitiva para la Gestión de Reciclaje
            </h1>
            <p className="mt-6 mx-auto max-w-3xl text-xl text-muted-foreground animate-fade-in [animation-delay:200ms]">
              Zycle centraliza tu inventario, finanzas y equipo en un solo lugar. Transforma tu operación, maximiza tu rentabilidad y lidera la economía circular.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in [animation-delay:400ms]">
              <Button asChild size="lg" className="text-lg w-full sm:w-auto">
                <Link href="/register">Comienza Gratis Hoy <ArrowRight className="ml-2"/></Link>
              </Button>
            </div>
             <div className="mt-16 relative max-w-5xl mx-auto animate-fade-in [animation-delay:600ms]">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob [animation-delay:2s]"></div>
                <video
                    src="/hero-video.mp4"
                    width="1200"
                    height="600"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="rounded-xl shadow-2xl drop-shadow-lg mx-auto border"
                    data-ai-hint="recycling process industrial"
                >
                    Tu navegador no soporta el tag de video.
                </video>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-headline">Un Ecosistema Integrado para tu ECA</h2>
              <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                Cada módulo está diseñado para trabajar en conjunto, dándote un control sin precedentes y una visión 360° de tu negocio.
              </p>
            </div>
            <Tabs defaultValue="gestion" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="gestion" className="py-3 text-base"><Package className="mr-2"/>Gestión</TabsTrigger>
                <TabsTrigger value="contabilidad" className="py-3 text-base"><HandCoins className="mr-2"/>Contabilidad</TabsTrigger>
                <TabsTrigger value="equipo" className="py-3 text-base"><Users className="mr-2"/>Equipo</TabsTrigger>
                <TabsTrigger value="reportes" className="py-3 text-base"><BarChart3 className="mr-2"/>Reportes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="gestion" className="mt-8">
                <Card>
                  <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                     <Image src="/gestion-material.png" alt="Bodega de reciclaje organizada con materiales clasificados" width={600} height={400} className="rounded-lg object-cover" />
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-primary">Control Total del Material</h3>
                      <p className="text-muted-foreground">Desde que el material entra hasta que sale, ten visibilidad completa.</p>
                      <ul className="space-y-3 text-foreground">
                        <li className="flex items-start gap-3"><Warehouse className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Inventario en Tiempo Real:</span> Tu stock se actualiza automáticamente con cada compra y venta.</div></li>
                        <li className="flex items-start gap-3"><MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Recolección en Fuente:</span> Registra material directamente en la ubicación del cliente con firma digital.</div></li>
                         <li className="flex items-start gap-3"><Truck className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Gestión de Flota:</span> Mantén un registro de tus vehículos para un mejor control de transporte.</div></li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contabilidad" className="mt-8">
                 <Card>
                  <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                     <Image src="/contabilidad-finanzas.png" alt="Persona usando una calculadora y revisando documentos financieros" width={600} height={400} className="rounded-lg object-cover" />
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-primary">Finanzas Claras y Simples</h3>
                      <p className="text-muted-foreground">Digitaliza tu flujo de caja para una contabilidad transparente y sin errores.</p>
                      <ul className="space-y-3 text-foreground">
                        <li className="flex items-start gap-3"><DollarSign className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Arqueo de Caja Diario:</span> Controla la base, ingresos, y gastos diarios vinculados a tu operación.</div></li>
                         <li className="flex items-start gap-3"><FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Facturación Simplificada:</span> Genera facturas de compra y venta en segundos.</div></li>
                        <li className="flex items-start gap-3"><TrendingUp className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Historial Financiero:</span> Accede a todos los cierres de caja para análisis y auditorías.</div></li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
               <TabsContent value="equipo" className="mt-8">
                 <Card>
                  <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                     <Image src="/gestion-equipo.png" alt="Equipo de trabajo colaborando en una oficina" width={600} height={400} className="rounded-lg object-cover" />
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-primary">Gestiona tu Talento</h3>
                      <p className="text-muted-foreground">Empodera a tu equipo con herramientas modernas que profesionalizan su trabajo.</p>
                      <ul className="space-y-3 text-foreground">
                        <li className="flex items-start gap-3"><Users className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Portal de Colaboradores:</span> Control de permisos, gestión de préstamos y canal de comunicación PQS.</div></li>
                        <li className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Control de Asistencia:</span> Moderniza el registro de entradas y salidas con códigos QR únicos por empleado.</div></li>
                        <li className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Roles y Permisos:</span> Define con precisión qué puede ver y hacer cada miembro de tu equipo en la plataforma.</div></li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
               <TabsContent value="reportes" className="mt-8">
                 <Card>
                  <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                     <Image src="/reportes-analiticas.png" alt="Gráficos y reportes de datos en una pantalla de computador" width={600} height={400} className="rounded-lg object-cover" />
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-primary">Decisiones Basadas en Datos</h3>
                      <p className="text-muted-foreground">Transforma la información de tu operación en inteligencia de negocio y cumple con la normativa.</p>
                      <ul className="space-y-3 text-foreground">
                        <li className="flex items-start gap-3"><FileSpreadsheet className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Exportación a Excel:</span> Descarga cualquier dato de la plataforma para tus análisis personalizados.</div></li>
                        <li className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Cumplimiento SUI:</span> Genera el reporte de Balance de Masas con la estructura exacta que requiere la superintendencia.</div></li>
                        <li className="flex items-start gap-3"><BarChart3 className="h-6 w-6 text-primary flex-shrink-0 mt-1"/><div><span className="font-semibold">Certificados de Aprovechamiento:</span> Fideliza a tus clientes con certificados en PDF profesionales y automáticos.</div></li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="plans" className="py-20 md:py-28">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-headline">Un Plan para Cada Etapa de tu Crecimiento</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Comienza gratis y escala a medida que tu operación crece. Simple, transparente y sin sorpresas.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {plans.map((plan, index) => (
                <Card key={index} className={cn("flex flex-col shadow-lg", plan.variant === 'default' && 'border-primary border-2 relative')}>
                  {plan.variant === 'default' && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold bg-primary text-primary-foreground">
                        Más Popular
                      </div>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-lg font-semibold text-primary">{plan.price}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="min-h-[40px] text-muted-foreground text-center mb-6">{plan.description}</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild size="lg" className="w-full text-lg" variant={plan.variant as any}>
                      <Link href={plan.name === 'Corporativo' ? 'mailto:contacto@zycle.app' : '/register'}>{plan.cta}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container text-center">
             <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">¿Listo para Digitalizar tu Operación?</h2>
             <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
               Únete a la nueva era de la gestión de materiales. Es fácil, rápido y tu primer mes es completamente gratis.
             </p>
             <div className="mt-8">
               <Button asChild size="lg" className="text-lg">
                 <Link href="/register">Crear Mi Cuenta en Zycle</Link>
               </Button>
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-primary text-lg font-headline">Zycle</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Zycle. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary">Términos de Servicio</Link>
            <Link href="#" className="hover:text-primary">Política de Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
