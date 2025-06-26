"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, BarChart3, Route, ShieldCheck, Store, TrendingUp, Users, Warehouse } from 'lucide-react';


export default function MarketingPage() {
  const features = [
    {
      icon: <Warehouse className="h-10 w-10 text-primary" />,
      title: "Inventario en Tiempo Real",
      description: "Control total de tu stock. Cada compra y venta actualiza automáticamente tus niveles de material, eliminando errores manuales."
    },
    {
      icon: <ArrowRightLeft className="h-10 w-10 text-primary" />,
      title: "Gestión de Compras y Ventas",
      description: "Genera facturas de compra y venta en segundos. Flujos de trabajo simplificados que ahorran tiempo y organizan tus finanzas."
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Portal de Asociados y SUI",
      description: "Administra la información de tus asociados de forma centralizada, facilitando el cumplimiento normativo para reportes SUI."
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-primary" />,
      title: "Analíticas y Reportes Visuales",
      description: "Dashboards intuitivos y reportes exportables que te dan una visión clara de la salud de tu operación para tomar mejores decisiones."
    }
  ];

  const futureFeatures = [
    {
      icon: <Route className="h-8 w-8 text-primary" />,
      title: "Logística Inteligente con IA",
      description: "Optimización de rutas de recolección y entrega para minimizar costos de combustible y tiempos de operación."
    },
    {
      icon: <Store className="h-8 w-8 text-primary" />,
      title: "Mercado Conectado de Materiales",
      description: "Una plataforma para conectar tu ECA con grandes transformadores y compradores, asegurando mejores precios y demanda constante."
    },
     {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Análisis Predictivo de Precios",
      description: "Modelos de Machine Learning que analizan tendencias del mercado para ayudarte a decidir el mejor momento para comprar o vender."
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Trazabilidad con Blockchain",
      description: "Certificados de sostenibilidad infalsificables que garantizan la trazabilidad de tus materiales, añadiendo valor a tu operación."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-3xl font-bold text-primary">ZYCLE</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-lg">
            <Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
            <Link href="#future" className="hover:text-primary transition-colors">Visión</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-lg">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild size="lg" className="text-lg hidden sm:flex">
              <Link href="/register">Regístrate Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 bg-muted/30">
          <div className="container text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-primary font-headline">
              Transforma Residuos en Recursos.
            </h1>
            <p className="mt-6 mx-auto max-w-3xl text-xl md:text-2xl text-muted-foreground">
              ZYCLE es la plataforma todo-en-uno que digitaliza y optimiza tu centro de reciclaje (ECA). Controla tu inventario, gestiona transacciones y asegura el cumplimiento, todo en un solo lugar.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="text-lg w-full sm:w-auto">
                <Link href="/register">Comienza Ahora - Es Gratis</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg w-full sm:w-auto">
                <Link href="#features">Descubrir Funcionalidades</Link>
              </Button>
            </div>
             <div className="mt-16">
                <Image 
                    src="https://placehold.co/1200x600.png"
                    alt="Dashboard de ZYCLE en un computador portátil"
                    width={1200}
                    height={600}
                    className="rounded-xl shadow-2xl mx-auto border"
                    data-ai-hint="recycled materials"
                />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-headline">La Caja de Herramientas para tu ECA</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Todo lo que necesitas para llevar tu operación al siguiente nivel de eficiencia y rentabilidad.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center p-6 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                  <CardHeader className="items-center">
                    {feature.icon}
                    <CardTitle className="mt-4 text-2xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-base">
                    {feature.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Future Vision Section */}
        <section id="future" className="py-20 md:py-28 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-headline text-primary">El Futuro es Circular y Digital</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                En ZYCLE, no solo resolvemos los problemas de hoy. Estamos construyendo las herramientas del mañana para una industria del reciclaje más inteligente, conectada y transparente.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {futureFeatures.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 md:py-32">
          <div className="container text-center">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">
              ¿Listo para potenciar tu operación de reciclaje?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
              Únete a la nueva era de la gestión de materiales. Es fácil, rápido y gratis para empezar.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="text-lg">
                <Link href="/register">Crear mi cuenta en ZYCLE</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">ZYCLE</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ZYCLE. Todos los derechos reservados.
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
