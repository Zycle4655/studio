
"use client";

import * as React from "react";
import { Plus, Trash2, Camera, Signature, MapPin, Package, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import type { FuenteDocument } from "@/schemas/fuente";
import type { MaterialDocument } from "@/schemas/material";
import type { RecoleccionItem, RecoleccionDocument } from "@/schemas/recoleccion";
import SignaturePad from "@/components/forms/SignaturePad";
import type SignatureCanvas from "react-signature-canvas";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function RegistrarRecoleccionPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, permissions } = useAuth();
  const signatureRef = React.useRef<SignatureCanvas>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [fuentes, setFuentes] = React.useState<FuenteDocument[]>([]);
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  
  const [selectedFuenteId, setSelectedFuenteId] = React.useState<string>("");
  const [currentItems, setCurrentItems] = React.useState<RecoleccionItem[]>([]);
  
  const [selectedMaterialId, setSelectedMaterialId] = React.useState("");
  const [currentPeso, setCurrentPeso] = React.useState("");

  const [firmaDataUrl, setFirmaDataUrl] = React.useState<string>("");
  const [selloFile, setSelloFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    document.title = 'Registrar Recolección en Fuente | ZYCLE';
    if (companyOwnerId) {
      fetchInitialData();
    } else {
        setIsLoading(false);
    }
  }, [companyOwnerId]);

  const fetchInitialData = async () => {
    if (!companyOwnerId) return;
    setIsLoading(true);
    try {
      const fuentesRef = collection(db, "companyProfiles", companyOwnerId, "fuentes");
      const materialsRef = collection(db, "companyProfiles", companyOwnerId, "materials");
      
      const [fuentesSnap, materialsSnap] = await Promise.all([
        getDocs(query(fuentesRef, orderBy("nombre", "asc"))),
        getDocs(query(materialsRef, orderBy("name", "asc")))
      ]);
      
      const fuentesList = fuentesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuenteDocument));
      const materialsList = materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialDocument));

      setFuentes(fuentesList);
      setMaterials(materialsList);
    } catch (error) {
      console.error("Error fetching initial data for collection:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las fuentes o materiales." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectedFuente = React.useMemo(() => {
    return fuentes.find(f => f.id === selectedFuenteId);
  }, [selectedFuenteId, fuentes]);

  const handleAddItem = () => {
    if (!selectedMaterialId || !currentPeso) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "Seleccione un material e ingrese el peso." });
      return;
    }
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;
    
    const newItem: RecoleccionItem = {
      materialId: material.id,
      materialName: material.name,
      peso: parseFloat(currentPeso),
    };

    setCurrentItems(prev => [...prev, newItem]);
    setSelectedMaterialId("");
    setCurrentPeso("");
  };

  const handleRemoveItem = (index: number) => {
    setCurrentItems(prev => prev.filter((_, i) => i !== index));
  };

  const uploadSello = async (companyId: string, recoleccionId: string, file: File): Promise<string> => {
    const filePath = `recolecciones/${companyId}/${recoleccionId}/sello.jpg`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };
  
  const resetForm = () => {
      setSelectedFuenteId("");
      setCurrentItems([]);
      setFirmaDataUrl("");
      setSelloFile(null);
      signatureRef.current?.clear();
      const fileInput = document.getElementById('sello-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
  };

  const handleSaveRecoleccion = async () => {
    if (!user || !companyOwnerId || !selectedFuente) {
        toast({ variant: "destructive", title: "Error", description: "Falta información de usuario o fuente." });
        return;
    }
    if (currentItems.length === 0) {
        toast({ variant: "destructive", title: "Sin ítems", description: "Debe agregar al menos un material recolectado." });
        return;
    }
    if (!firmaDataUrl || firmaDataUrl.length < 50) { // Basic check for empty signature
        toast({ variant: "destructive", title: "Firma Requerida", description: "El encargado debe firmar el recibo." });
        return;
    }

    setIsSubmitting(true);
    try {
        const recoleccionesRef = collection(db, "companyProfiles", companyOwnerId, "recolecciones");
        const newRecoleccionRef = doc(recoleccionesRef); // Creates ref with a new auto-generated ID
        const recoleccionId = newRecoleccionRef.id;

        let selloImageUrl: string | null = null;
        if (selloFile) {
            selloImageUrl = await uploadSello(companyOwnerId, recoleccionId, selloFile);
        }
        
        const totalPeso = currentItems.reduce((sum, item) => sum + item.peso, 0);

        const recoleccionDoc: Omit<RecoleccionDocument, 'id'> = {
            userId: user.uid,
            fuenteId: selectedFuente.id,
            fuenteNombre: selectedFuente.nombre,
            encargadoNombre: selectedFuente.encargadoNombre,
            fecha: serverTimestamp(),
            items: currentItems,
            totalPeso: totalPeso,
            firmaDataUrl: firmaDataUrl,
            selloImageUrl: selloImageUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(newRecoleccionRef, recoleccionDoc);

        toast({
            title: "Recolección Guardada",
            description: "El registro de la recolección ha sido guardado exitosamente.",
            className: "bg-green-100 border-green-500 text-green-800"
        });
        
        resetForm();

    } catch(error) {
        console.error("Error saving collection:", error);
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el registro." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }
  
  if (!permissions?.gestionMaterial) {
      return (
        <div className="container py-8 px-4 md:px-6">
            <Card><CardContent className="py-12 text-center">No tiene permiso para acceder a esta sección.</CardContent></Card>
        </div>
      )
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <MapPin className="mr-3 h-7 w-7" />
            Registrar Recolección en Fuente
          </CardTitle>
          <CardDescription>
            Complete los datos de la recolección para generar un recibo digital.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paso 1: Seleccionar Fuente */}
          <div className="space-y-2">
            <label className="font-medium">1. Seleccionar la Fuente</label>
            <Select value={selectedFuenteId} onValueChange={setSelectedFuenteId} disabled={isSubmitting}>
              <SelectTrigger><SelectValue placeholder="Elija una fuente de recolección..." /></SelectTrigger>
              <SelectContent>
                {fuentes.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
             {selectedFuente && (
                <Card className="mt-2 bg-muted/50 p-4 text-sm">
                    <p><strong>Dirección:</strong> {selectedFuente.direccion}</p>
                    <p><strong>Encargado:</strong> {selectedFuente.encargadoNombre}</p>
                </Card>
            )}
          </div>
          
          <Separator />
          
          {/* Paso 2: Agregar Materiales */}
          <div className="space-y-4">
              <label className="font-medium block">2. Registrar Materiales Recolectados</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                    <label htmlFor="material-select" className="text-xs text-muted-foreground">Material</label>
                    <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId} disabled={isSubmitting}>
                        <SelectTrigger id="material-select"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                     <label htmlFor="peso-input" className="text-xs text-muted-foreground">Peso (kg)</label>
                    <Input id="peso-input" type="number" placeholder="0.00" value={currentPeso} onChange={e => setCurrentPeso(e.target.value)} disabled={isSubmitting} />
                </div>
                <Button onClick={handleAddItem} disabled={isSubmitting || !selectedMaterialId || !currentPeso}>
                    <Plus className="mr-2 h-4 w-4" /> Agregar Ítem
                </Button>
              </div>

              {currentItems.length > 0 && (
                <div className="border rounded-md p-2">
                    <ul className="space-y-2">
                        {currentItems.map((item, index) => (
                            <li key={index} className="flex justify-between items-center bg-background p-2 rounded-md">
                                <div className="flex items-center gap-2">
                                    <Package size={16} className="text-primary"/>
                                    <span>{item.materialName}</span>
                                    <span className="text-muted-foreground">- {item.peso} kg</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={isSubmitting} className="h-7 w-7">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
              )}
          </div>

          <Separator />

          {/* Paso 3: Firma y Sello */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <label className="font-medium flex items-center gap-2">3. Firma del Encargado <span className="text-destructive">*</span></label>
                  <SignaturePad signatureRef={signatureRef} onSignatureEnd={setFirmaDataUrl} />
              </div>
              <div className="space-y-2">
                  <label className="font-medium">4. Foto del Sello (Opcional)</label>
                   <Input id="sello-input" type="file" accept="image/*" capture="environment" onChange={(e) => setSelloFile(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
                   {selloFile && <p className="text-xs text-green-600 flex items-center gap-1 mt-2"><CheckCircle size={14}/> {selloFile.name} listo para subir.</p>}
                   {!selloFile && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><AlertTriangle size={14}/> Sin foto de sello seleccionada.</p>}
              </div>
          </div>
          
          <Separator />
          
          {/* Paso 4: Guardar */}
          <div className="flex justify-end">
              <Button onClick={handleSaveRecoleccion} size="lg" disabled={isSubmitting || isLoading || !selectedFuenteId || currentItems.length === 0 || !firmaDataUrl}>
                  {isSubmitting ? "Guardando..." : "Guardar Recolección"}
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
