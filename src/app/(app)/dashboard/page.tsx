
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Settings } from "lucide-react"; 
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | ZYCLE',
  description: 'Panel principal de ZYCLE para la gestión de materiales aprovechables.',
};

export default function DashboardPage() {
  const features = [
    { name: "Registrar Material", icon: <PlusCircle className="w-8 h-8 text-primary" />, description: "Añada nuevos tipos de materiales reciclables al sistema.", link: "/dashboard/gestion-material/materiales" },
    { name: "Configuración de Cuenta", icon: <Settings className="w-8 h-8 text-primary" />, description: "Ajuste los detalles y preferencias de su cuenta.", link: "/settings" },
  ];

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">Bienvenido a ZYCLE</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Su panel central para la gestión eficiente de materiales aprovechables.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.name} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xl font-semibold font-headline">{feature.name}</CardTitle>
              {feature.icon}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
              <Button variant="outline" asChild className="w-full md:w-auto">
                <Link href={feature.link}>Acceder</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-12 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Próximas Funcionalidades</CardTitle>
          <CardDescription>Estamos trabajando en nuevas herramientas para potenciar su gestión.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Reportes detallados de recolección y procesamiento.</li>
            <li>Integración con sistemas de pesaje.</li>
            <li>Gestión de rutas de recolección optimizadas.</li>
            <li>Portal para clientes y proveedores.</li>
          </ul>
          <p className="mt-6 text-sm text-primary font-semibold">
            ¡Manténgase atento a las actualizaciones!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
