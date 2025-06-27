"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import type { AsistenciaRecord } from "@/schemas/asistencia";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { QrCode, CalendarCheck } from "lucide-react";

export default function ControlAsistenciaPage() {
  const { companyOwnerId, permissions } = useAuth();
  const [registros, setRegistros] = React.useState<AsistenciaRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    document.title = 'Talento Humano: Control de Asistencia | ZYCLE';
  }, []);

  const fetchAsistencia = React.useCallback(async () => {
    if (!companyOwnerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const asistenciaRef = collection(db, "companyProfiles", companyOwnerId, "asistencia");
      const q = query(asistenciaRef, orderBy("fecha", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsistenciaRecord));
      setRegistros(data);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId]);

  React.useEffect(() => {
    if (companyOwnerId) {
      fetchAsistencia();
    }
  }, [companyOwnerId, fetchAsistencia]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const jsDate = date.toDate ? date.toDate() : new Date(date);
    return format(jsDate, "d 'de' MMMM, yyyy 'a las' HH:mm:ss", { locale: es });
  };

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-headline text-primary flex items-center">
              <CalendarCheck className="mr-3 h-7 w-7" />
              Control de Asistencia
            </CardTitle>
            <CardDescription>
              Vea los últimos registros de entrada y salida del personal.
            </CardDescription>
          </div>
          {permissions?.equipo && (
             <Button asChild>
                <Link href="/dashboard/talento-humano/asistencia/escaner">
                  <QrCode className="mr-2 h-4 w-4" />
                  Abrir Terminal de Escáner
                </Link>
             </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-24" /> 
                        <Skeleton className="h-4 w-32" /> 
                    </div>
                     <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay registros de asistencia</h3>
              <p className="text-muted-foreground">Cuando se registren entradas o salidas, aparecerán aquí.</p>
            </div>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead className="text-center">Tipo de Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="font-medium">{registro.colaboradorNombre}</TableCell>
                      <TableCell>{formatDate(registro.fecha)}</TableCell>
                      <TableCell className="text-center">
                         <Badge variant={registro.tipo === 'entrada' ? 'default' : 'secondary'} className={registro.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
