
"use client";

import * as React from "react";
import { Plus, Trash2, Camera, Signature, MapPin, Package, CheckCircle, AlertTriangle, ChevronsUpDown, Check, FileDown, Share2, Printer, PlusCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RegistrarRecoleccionPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, companyProfile, permissions } = useAuth();
  const signatureRef = React.useRef<SignatureCanvas>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [fuentes, setFuentes] = React.useState<FuenteDocument[]>([]);
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [selectedFuenteId, setSelectedFuenteId] = React.useState<string>("");
  const [openFuenteCombobox, setOpenFuenteCombobox] = React.useState(false);
  const [currentItems, setCurrentItems] = React.useState<RecoleccionItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = React.useState("");
  const [currentPeso, setCurrentPeso] = React.useState("");
  const [openMaterialCombobox, setOpenMaterialCombobox] = React.useState(false);
  const [firmaDataUrl, setFirmaDataUrl] = React.useState<string>("");
  const [selloFile, setSelloFile] = React.useState<File | null>(null);

  // View control
  const [view, setView] = React.useState<'form' | 'success'>('form');
  const [lastRecoleccion, setLastRecoleccion] = React.useState<RecoleccionDocument | null>(null);
  const [isShareSupported, setIsShareSupported] = React.useState(false);

  React.useEffect(() => {
    document.title = 'Registrar Recolección en Fuente | ZYCLE';
    if (navigator.share) {
        setIsShareSupported(true);
    }
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
    setOpenMaterialCombobox(false);
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
      setLastRecoleccion(null);
      setView('form');
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
    if (!firmaDataUrl || firmaDataUrl.length < 50) { 
        toast({ variant: "destructive", title: "Firma Requerida", description: "El encargado debe firmar el recibo." });
        return;
    }

    setIsSubmitting(true);
    try {
        const recoleccionesRef = collection(db, "companyProfiles", companyOwnerId, "recolecciones");
        const newRecoleccionRef = doc(recoleccionesRef);
        const recoleccionId = newRecoleccionRef.id;

        let selloImageUrl: string | null = null;
        if (selloFile) {
            selloImageUrl = await uploadSello(companyOwnerId, recoleccionId, selloFile);
        }
        
        const totalPeso = currentItems.reduce((sum, item) => sum + item.peso, 0);
        const fechaServer = serverTimestamp();

        const recoleccionDoc: RecoleccionDocument = {
            id: recoleccionId,
            userId: user.uid,
            fuenteId: selectedFuente.id,
            fuenteNombre: selectedFuente.nombre,
            encargadoNombre: selectedFuente.encargadoNombre,
            fecha: fechaServer,
            items: currentItems,
            totalPeso: totalPeso,
            firmaDataUrl: firmaDataUrl,
            selloImageUrl: selloImageUrl,
            createdAt: fechaServer,
            updatedAt: fechaServer,
        };

        await setDoc(newRecoleccionRef, recoleccionDoc);

        toast({
            title: "Recolección Guardada",
            description: "El registro ha sido guardado. Ahora puede descargar o compartir el recibo.",
        });
        
        setLastRecoleccion(recoleccionDoc);
        setView('success');

    } catch(error) {
        console.error("Error saving collection:", error);
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el registro." });
    } finally {
        setIsSubmitting(false);
    }
  };

    const generatePdf = (recoleccionData: RecoleccionDocument) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [80, 150] // POS receipt size
        });

        const formatDate = (timestamp: any) => {
            if (!timestamp) return "N/A";
            const jsDate = timestamp.toDate ? timestamp.toDate() : new Date();
            return format(jsDate, "d 'de' MMMM, yyyy HH:mm", { locale: es });
        };

        const companyName = companyProfile?.companyName || 'Recibo de Recolección';
        const nit = companyProfile?.nit || '';
        const address = companyProfile?.address || '';
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 40, 10, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        if(nit) doc.text(`NIT: ${nit}`, 40, 14, { align: 'center' });
        if(address) doc.text(address, 40, 18, { align: 'center' });

        doc.setLineDashPattern([0.5, 0.5], 0);
        doc.line(5, 22, 75, 22);

        doc.setFontSize(8);
        doc.text(`Fecha: ${formatDate(recoleccionData.fecha)}`, 5, 26);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Fuente: ${recoleccionData.fuenteNombre}`, 5, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Encargado: ${recoleccionData.encargadoNombre}`, 5, 36);
        
        doc.setLineDashPattern([0.5, 0.5], 0);
        doc.line(5, 40, 75, 40);

        let y = 45;
        doc.setFont('helvetica', 'bold');
        doc.text('Material', 5, y);
        doc.text('Peso (kg)', 75, y, { align: 'right' });
        y += 2;
        doc.line(5, y, 75, y);
        y += 3;

        doc.setFont('helvetica', 'normal');
        recoleccionData.items.forEach(item => {
            doc.text(item.materialName, 5, y);
            doc.text(`${item.peso.toFixed(2)}`, 75, y, { align: 'right' });
            y += 5;
        });

        doc.line(5, y, 75, y);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Total Recolectado:', 5, y);
        doc.text(`${recoleccionData.totalPeso.toFixed(2)} kg`, 75, y, { align: 'right' });
        y += 8;

        doc.text('Firma del Encargado:', 5, y);
        y += 2;
        doc.addImage(recoleccionData.firmaDataUrl, 'PNG', 15, y, 50, 20, undefined, 'FAST');
        
        return doc;
    };


  const handleDownloadPdf = () => {
    if (!lastRecoleccion) return;
    const pdf = generatePdf(lastRecoleccion);
    pdf.save(`recibo_${lastRecoleccion.fuenteNombre.replace(/ /g, '_')}_${lastRecoleccion.id?.substring(0,5)}.pdf`);
  };

  const handleShare = async () => {
    if (!lastRecoleccion || !navigator.share) return;
    try {
        const pdf = generatePdf(lastRecoleccion);
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `recibo_${lastRecoleccion.fuenteNombre.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
        
        await navigator.share({
            title: `Recibo de Recolección - ${companyProfile?.companyName || ''}`,
            text: `Adjunto el recibo de la recolección en ${lastRecoleccion.fuenteNombre}.`,
            files: [pdfFile],
        });
    } catch (error) {
        console.error("Error al compartir:", error);
        toast({ variant: 'destructive', title: 'Error al compartir', description: 'No se pudo compartir el archivo.' });
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
            {view === 'form' ? 'Registrar Recolección en Fuente' : 'Recolección Guardada'}
          </CardTitle>
          <CardDescription>
            {view === 'form' 
                ? 'Complete los datos de la recolección para generar un recibo digital.'
                : 'El registro se ha guardado exitosamente. Descargue o comparta el recibo.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {view === 'form' ? (
            <>
              {/* Paso 1: Seleccionar Fuente */}
              <div className="space-y-2">
                <label className="font-medium">1. Seleccionar la Fuente</label>
                <Popover open={openFuenteCombobox} onOpenChange={setOpenFuenteCombobox}>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openFuenteCombobox}
                        className="w-full justify-between"
                        disabled={isSubmitting || fuentes.length === 0}
                    >
                        {selectedFuenteId
                        ? fuentes.find((fuente) => fuente.id === selectedFuenteId)?.nombre
                        : "Busque y seleccione una fuente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar fuente por nombre..." />
                        <CommandList>
                        <CommandEmpty>No se encontró ninguna fuente.</CommandEmpty>
                        <CommandGroup>
                            {fuentes.map((fuente) => (
                            <CommandItem
                                key={fuente.id}
                                value={fuente.nombre}
                                onSelect={() => {
                                    setSelectedFuenteId(fuente.id);
                                    setOpenFuenteCombobox(false);
                                }}
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedFuenteId === fuente.id ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {fuente.nombre}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        </CommandList>
                    </Command>
                    </PopoverContent>
                </Popover>
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
                        <Popover open={openMaterialCombobox} onOpenChange={setOpenMaterialCombobox}>
                            <PopoverTrigger asChild>
                            <Button
                                id="material-select"
                                variant="outline"
                                role="combobox"
                                aria-expanded={openMaterialCombobox}
                                className="w-full justify-between"
                                disabled={isSubmitting}
                            >
                                {selectedMaterialId
                                ? materials.find((material) => material.id === selectedMaterialId)?.name
                                : "Seleccionar..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar material..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró ningún material.</CommandEmpty>
                                        <CommandGroup>
                                            {materials.map((material) => (
                                                <CommandItem
                                                    key={material.id}
                                                    value={material.name}
                                                    onSelect={() => {
                                                        setSelectedMaterialId(material.id);
                                                        setOpenMaterialCombobox(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedMaterialId === material.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {material.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
            </>
          ) : (
            <div className="text-center space-y-6 py-8">
                 <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                 <h3 className="text-2xl font-bold">¡Recolección Guardada!</h3>
                 <p className="text-muted-foreground">Se ha creado el registro para la recolección en <br/> <span className="font-semibold text-foreground">{lastRecoleccion?.fuenteNombre}</span>.</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                     <Button onClick={handleDownloadPdf} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Descargar PDF</Button>
                     {isShareSupported && (
                         <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Compartir Recibo</Button>
                     )}
                 </div>
            </div>
          )}
        </CardContent>
        {view === 'success' && (
            <CardFooter className="flex justify-center border-t pt-6">
                 <Button onClick={resetForm} variant="secondary">
                     <PlusCircleIcon className="mr-2 h-4 w-4"/>
                     Registrar Nueva Recolección
                 </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
