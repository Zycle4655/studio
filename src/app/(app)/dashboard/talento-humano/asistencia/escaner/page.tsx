
"use client";

import * as React from "react";
import { QrCode, LogIn, LogOut, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { CollaboratorDocument } from "@/schemas/equipo";

type RegistrationType = "entrada" | "salida";

export default function EscanerAsistenciaPage() {
  const { toast } = useToast();
  const { companyOwnerId, permissions } = useAuth();
  
  const [registrationType, setRegistrationType] = React.useState<RegistrationType | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastScanResult, setLastScanResult] = React.useState<{ status: "success" | "error"; message: string } | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = "Terminal de Escáner | ZYCLE";
    // Check for permissions
    if (permissions && !permissions.equipo) {
      toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para acceder a esta página." });
    }
  }, [permissions, toast]);

  const handleScanResult = async (result: string) => {
    if (isSubmitting || !registrationType) {
      if (!registrationType) {
        toast({ variant: "destructive", title: "Seleccione un Modo", description: "Por favor, elija 'Registrar Entrada' o 'Registrar Salida' antes de escanear." });
      }
      return;
    }
    
    setIsSubmitting(true);
    setLastScanResult(null);

    // The result should be the collaborator's Firestore document ID.
    const collaboratorId = result;

    if (!companyOwnerId) {
      toast({ variant: "destructive", title: "Error de Autenticación", description: "No se pudo identificar la empresa." });
      setIsSubmitting(false);
      return;
    }

    try {
      const collaboratorRef = doc(db, "companyProfiles", companyOwnerId, "collaborators", collaboratorId);
      const collaboratorSnap = await getDoc(collaboratorRef);

      if (!collaboratorSnap.exists()) {
        setLastScanResult({ status: "error", message: "Código QR no reconocido. Colaborador no encontrado." });
        throw new Error("Collaborator not found");
      }

      const collaboratorData = collaboratorSnap.data() as CollaboratorDocument;

      const attendanceRef = collection(db, "companyProfiles", companyOwnerId, "asistencia");
      await addDoc(attendanceRef, {
        colaboradorId: collaboratorId,
        colaboradorNombre: collaboratorData.nombre,
        fecha: serverTimestamp(),
        tipo: registrationType,
        metodo: "qr",
      });
      
      const successMessage = registrationType === 'entrada' 
        ? `¡Bienvenido, ${collaboratorData.nombre}!` 
        : `¡Hasta luego, ${collaboratorData.nombre}!`;

      setLastScanResult({ status: "success", message: successMessage });

    } catch (error) {
      console.error("Error processing scan:", error);
      if (!lastScanResult) { // Avoid overwriting specific error messages
         setLastScanResult({ status: "error", message: "Error al procesar el registro. Intente de nuevo." });
      }
    } finally {
      // Allow for another scan after a short delay
      setTimeout(() => setIsSubmitting(false), 2000); 
       // Clear the result message after a few seconds
      setTimeout(() => setLastScanResult(null), 5000);
    }
  };

  const handleCameraError = (error: Error) => {
    console.error("Camera Error:", error);
    setLastScanResult(null);
    if (error.name === "NotAllowedError") {
        setCameraError("Permiso de cámara denegado. Por favor, permita el acceso a la cámara en la configuración de su navegador y refresque la página.");
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError" || error.message.includes("Requested device not found")) {
        setCameraError("No se encontró ninguna cámara. Por favor, conecte una cámara y vuelva a intentarlo.");
    } else {
        setCameraError("Ocurrió un error al acceder a la cámara. Intente de nuevo o revise la configuración de su dispositivo.");
    }
  };


  if (permissions === null) {
      return ( // Loading state for permissions
           <div className="container py-8 px-4 md:px-6 text-center">
            <p>Cargando permisos...</p>
           </div>
      );
  }

  if (!permissions?.equipo) {
    return (
       <div className="container py-8 px-4 md:px-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No tiene los permisos necesarios para acceder a esta funcionalidad.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary flex items-center justify-center">
            <QrCode className="mr-3 h-8 w-8" />
            Terminal de Asistencia
          </CardTitle>
          <CardDescription>
            Seleccione un modo y escanee el código QR del colaborador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={() => setRegistrationType("entrada")}
              variant={registrationType === "entrada" ? "default" : "outline"}
              className="h-16 text-lg"
              disabled={isSubmitting}
            >
              <LogIn className="mr-2 h-6 w-6" />
              Registrar Entrada
            </Button>
            <Button
              onClick={() => setRegistrationType("salida")}
              variant={registrationType === "salida" ? "destructive" : "outline"}
              className={cn("h-16 text-lg", 
                registrationType === 'salida' 
                ? 'bg-destructive hover:bg-destructive/90' 
                : 'text-destructive border-destructive hover:bg-destructive/10'
              )}
              disabled={isSubmitting}
            >
              <LogOut className="mr-2 h-6 w-6" />
              Registrar Salida
            </Button>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
            {cameraError ? (
                <Alert variant="destructive" className="w-auto m-4 text-center">
                    <VideoOff className="h-5 w-5 mx-auto mb-2"/>
                    <AlertTitle>Error de Cámara</AlertTitle>
                    <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
            ) : (
                <>
                    <QrScanner
                      onDecode={(result) => handleScanResult(result)}
                      onError={handleCameraError}
                      options={{
                          delay: 500,
                      }}
                      styles={{
                          container: { width: '100%', height: '100%' },
                      }}
                    />
                    {!registrationType && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <p className="text-white text-lg font-semibold text-center p-4">Seleccione un modo para activar el escáner</p>
                        </div>
                    )}
                </>
            )}
          </div>
          
          {lastScanResult && (
            <Alert variant={lastScanResult.status === 'error' ? 'destructive' : 'default'} className={cn(
                "transition-all",
                lastScanResult.status === 'success' && "border-green-500 bg-green-50 text-green-800 [&>svg]:text-green-600"
            )}>
              <AlertTitle className="font-bold">{lastScanResult.status === 'success' ? 'Éxito' : 'Error'}</AlertTitle>
              <AlertDescription>{lastScanResult.message}</AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
