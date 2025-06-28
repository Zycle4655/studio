
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Landmark } from "lucide-react";
import * as React from "react";

export default function ArqueoCajaPage() {

  React.useEffect(() => {
    document.title = 'Arqueo de Caja | ZYCLE';
  }, []);

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Landmark className="mr-3 h-7 w-7" />
            Arqueo de Caja
          </CardTitle>
          <CardDescription>
            Esta funcionalidad estará disponible próximamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">En Construcción</h3>
            <p className="text-muted-foreground">Estamos trabajando para integrar un módulo completo de arqueo de caja que simplifique su control financiero diario.</p>
        </CardContent>
      </Card>
    </div>
  );
}
