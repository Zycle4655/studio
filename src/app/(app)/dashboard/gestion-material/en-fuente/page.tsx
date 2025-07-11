
"use client";

import * as React from "react";
import { Plus, Trash2, Camera, Signature, MapPin, Package, CheckCircle, AlertTriangle, ChevronsUpDown, Check, FileDown, Share2, Printer, PlusCircleIcon, Truck, DollarSign, UserCheck } from "lucide-react";
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
import type { VehiculoDocument } from "@/schemas/vehiculo";
import type { RecoleccionItem, RecoleccionDocument } from "@/schemas/recoleccion";
import type { CompanyProfileDocument } from "@/schemas/company";
import SignaturePad from "@/components/forms/SignaturePad";
import type SignatureCanvas from "react-signature-canvas";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

export default function RegistrarRecoleccionPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, companyProfile, permissions, collaboratorName } = useAuth();
  const signatureRef = React.useRef<SignatureCanvas>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [fuentes, setFuentes] = React.useState<FuenteDocument[]>([]);
  const [materials, setMaterials] = React.useState<MaterialDocument[]>([]);
  const [vehiculos, setVehiculos] = React.useState<VehiculoDocument[]>([]);
  
  const [selectedFuenteId, setSelectedFuenteId] = React.useState<string>("");
  const [selectedVehiculoId, setSelectedVehiculoId] = React.useState<string>("");
  
  const [openFuenteCombobox, setOpenFuenteCombobox] = React.useState(false);
  const [openVehiculoCombobox, setOpenVehiculoCombobox] = React.useState(false);

  const [currentItems, setCurrentItems] = React.useState<RecoleccionItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = React.useState("");
  const [currentPeso, setCurrentPeso] = React.useState("");
  const [openMaterialCombobox, setOpenMaterialCombobox] = React.useState(false);

  const [firmaDataUrl, setFirmaDataUrl] = React.useState<string>("");
  const [selloFile, setSelloFile] = React.useState<File | null>(null);
  const [observaciones, setObservaciones] = React.useState<string>("");

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
      const vehiculosRef = collection(db, "companyProfiles", companyOwnerId, "vehiculos");
      
      const [fuentesSnap, materialsSnap, vehiculosSnap] = await Promise.all([
        getDocs(query(fuentesRef, orderBy("nombre", "asc"))),
        getDocs(query(materialsRef, orderBy("name", "asc"))),
        getDocs(query(vehiculosRef, orderBy("placa", "asc")))
      ]);
      
      const fuentesList = fuentesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuenteDocument));
      const materialsList = materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialDocument));
      const vehiculosList = vehiculosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehiculoDocument));

      setFuentes(fuentesList);
      setMaterials(materialsList);
      setVehiculos(vehiculosList);
    } catch (error) {
      console.error("Error fetching initial data for collection:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las fuentes, materiales o vehículos." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectedFuente = React.useMemo(() => {
    return fuentes.find(f => f.id === selectedFuenteId);
  }, [selectedFuenteId, fuentes]);
  
  const selectedVehiculo = React.useMemo(() => {
    return vehiculos.find(v => v.id === selectedVehiculoId);
  }, [selectedVehiculoId, vehiculos]);

  const handleAddItem = () => {
    if (!selectedMaterialId || !currentPeso) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "Seleccione un material e ingrese el peso." });
      return;
    }
    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;
    
    const peso = parseFloat(currentPeso);
    // If it's a 'venta' source, use the material's base price. Otherwise, it's a donation (price 0).
    const precio = selectedFuente?.tipo === 'venta' ? (material.price || 0) : 0;
    
    const newItem: RecoleccionItem = {
      materialId: material.id,
      materialName: material.name,
      peso: peso,
      precioUnitario: precio,
      subtotal: peso * precio,
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
      setSelectedVehiculoId("");
      setCurrentItems([]);
      setFirmaDataUrl("");
      setSelloFile(null);
      setObservaciones("");
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
    if (!selectedVehiculo) {
        toast({ variant: "destructive", title: "Vehículo Requerido", description: "Debe seleccionar un vehículo para la recolección." });
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
        const totalValor = currentItems.reduce((sum, item) => sum + item.subtotal, 0);
        const fechaServer = serverTimestamp();

        const recoleccionDoc: RecoleccionDocument = {
            id: recoleccionId,
            userId: user.uid,
            fuenteId: selectedFuente.id,
            fuenteNombre: selectedFuente.nombre,
            encargadoNombre: selectedFuente.encargadoNombre,
            vehiculoId: selectedVehiculo.id,
            vehiculoPlaca: selectedVehiculo.placa,
            registradoPorNombre: collaboratorName || user.displayName || "No Identificado",
            fecha: fechaServer,
            items: currentItems,
            totalPeso: totalPeso,
            totalValor: totalValor,
            firmaDataUrl: firmaDataUrl,
            selloImageUrl: selloImageUrl,
            observaciones: observaciones || null,
            createdAt: fechaServer,
            updatedAt: fechaServer,
        };

        await setDoc(newRecoleccionRef, recoleccionDoc);

        toast({
            title: "Recolección Guardada",
            description: "El registro ha sido guardado. Ahora puede descargar o compartir la planilla.",
        });
        
        const finalDocForPdf = { ...recoleccionDoc, fecha: new Date() };
        setLastRecoleccion(finalDocForPdf as unknown as RecoleccionDocument);
        setView('success');

    } catch(error) {
        console.error("Error saving collection:", error);
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el registro." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
    const formatDate = (dateValue: Date): string => {
        if (!dateValue) return "N/A";
        return format(dateValue, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }); 
    };

    const generatePdf = async (recoleccionData: RecoleccionDocument, profileData: CompanyProfileDocument | null) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;

        // Font setup
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        // --- HEADER ---
        if (profileData?.logoUrl) {
          try {
            await new Promise<void>((resolve) => {
              const img = document.createElement('img');
              img.crossOrigin = "Anonymous";
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.warn('Failed to get canvas context for logo.');
                    return resolve();
                }
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');

                const imgWidth = 40;
                const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;
                doc.addImage(dataUrl, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight, undefined, 'FAST');
                y += imgHeight + 5;
                resolve();
              };
              img.onerror = (err) => {
                console.warn("Could not load logo for PDF, continuing without it. This is likely a CORS issue.", err);
                resolve(); // Gracefully continue without the logo
              };
              img.src = profileData.logoUrl!;
            });
          } catch (e) {
            console.error("An unexpected error occurred while trying to add logo to PDF.", e);
          }
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(profileData?.companyName || 'Nombre de la Empresa', pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFont('helvetica', 'normal');
        if (profileData?.nit) { doc.text(`NIT: ${profileData.nit}`, pageWidth / 2, y, { align: 'center' }); y += 5; }
        if (profileData?.phone) { doc.text(`Tel: ${profileData.phone}`, pageWidth / 2, y, { align: 'center' }); y += 5; }
        if (profileData?.email) { doc.text(profileData.email, pageWidth / 2, y, { align: 'center' }); y += 5; }
        y += 10;

        // --- INFO BLOCK ---
        doc.setFont('helvetica', 'bold');
        doc.text('FECHA:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(recoleccionData.fecha as unknown as Date), margin + 45, y);
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('FUENTE:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(recoleccionData.fuenteNombre, margin + 45, y);
        y += 7;

        if (recoleccionData.vehiculoPlaca) {
            doc.setFont('helvetica', 'bold');
            doc.text('VEHÍCULO:', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(recoleccionData.vehiculoPlaca, margin + 45, y);
            y += 7;
        }
        y += 10;

        // --- TITLE ---
        doc.setFont('helvetica', 'bold');
        doc.text("DETALLES DE LA RECOLECCIÓN", pageWidth / 2, y, { align: 'center' });
        y += 10;
        
        // --- MATERIALS TABLE ---
        (doc as any).autoTable({
            startY: y,
            head: [['Material', 'Peso (kg)']],
            body: recoleccionData.items.map(item => [item.materialName, item.peso.toFixed(2)]),
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 12,
                cellPadding: 2,
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [255, 255, 255], // White
                fontStyle: 'bold',
                textColor: [0, 0, 0],
            },
            bodyStyles: {
                fillColor: [255, 255, 255], // White
            },
            didDrawPage: (data: any) => { y = data.cursor.y; }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        
        // --- OBSERVACIONES ---
        if (recoleccionData.observaciones) {
            doc.setFont('helvetica', 'bold').text('OBSERVACIONES:', margin, y);
            y += 7;
            doc.setFont('helvetica', 'normal');
            const splitObservaciones = doc.splitTextToSize(recoleccionData.observaciones, pageWidth - (margin * 2));
            doc.text(splitObservaciones, margin, y);
            y += (splitObservaciones.length * 5) + 5;
        }

        // --- GESTOR AMBIENTAL ---
        if (recoleccionData.registradoPorNombre) {
            doc.setFont('helvetica', 'bold');
            doc.text('GESTOR AMBIENTAL:', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(recoleccionData.registradoPorNombre, margin + 50, y);
            y += 15;
        }

        // --- FOOTER / SIGNATURE ---
        if (y > pageHeight - 60) { doc.addPage(); y = margin + 20; }
        
        try {
            const signatureImgProps = doc.getImageProperties(recoleccionData.firmaDataUrl);
            const signatureWidth = 80;
            const signatureHeight = (signatureImgProps.height * signatureWidth) / signatureImgProps.width;
            doc.addImage(recoleccionData.firmaDataUrl, 'PNG', margin, y, signatureWidth, signatureHeight, undefined, 'FAST');
            y += signatureHeight;
        } catch (e) {
            console.error("Error adding signature to PDF:", e);
            doc.setFont('helvetica', 'italic').text('[Error al cargar la firma]', margin, y + 15);
            y += 20;
        }

        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + 80, y);
        y += 7;
        doc.setFont('helvetica', 'normal').setFontSize(12);
        doc.text(recoleccionData.encargadoNombre, margin, y);
        y += 5;
        doc.setFont('helvetica', 'bold').setFontSize(10);
        doc.text('ENCARGADO', margin, y);
        
        return doc;
    };


  const handleDownloadPdf = async () => {
    if (!lastRecoleccion) return;
    const pdf = await generatePdf(lastRecoleccion, companyProfile);
    pdf.save(`planilla_${lastRecoleccion.fuenteNombre.replace(/ /g, '_')}_${lastRecoleccion.id?.substring(0,5)}.pdf`);
  };

  const handleShare = async () => {
    if (!lastRecoleccion || !navigator.share) return;
    try {
        const pdf = await generatePdf(lastRecoleccion, companyProfile);
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `planilla_${lastRecoleccion.fuenteNombre.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
        
        await navigator.share({
            title: `Planilla de Recolección - ${companyProfile?.companyName || ''}`,
            text: `Adjunto la planilla de la recolección en ${lastRecoleccion.fuenteNombre}.`,
            files: [pdfFile],
        });
    } catch (error) {
        console.error("Error al compartir:", error);
        toast({ variant: 'destructive', title: 'Error al compartir', description: 'No se pudo compartir el archivo.' });
    }
  };

  const totalCurrentValor = currentItems.reduce((acc, item) => acc + item.subtotal, 0);


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
            <Card>
                <CardContent className="py-12 text-center">No tiene permiso para acceder a esta sección.</CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <MapPin className="mr-3 h-7 w-7" />
            {view === 'form' ? 'Registrar Recolección en Fuente' : 'Planilla de Recolección Guardada'}
          </CardTitle>
          <CardDescription>
            {view === 'form' 
                ? 'Complete los datos de la recolección para generar una planilla digital.'
                : 'El registro se ha guardado exitosamente. Descargue o comparta la planilla.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {view === 'form' ? (
            <>
              {/* Paso 1: Seleccionar Fuente y Vehículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Card className="mt-2 bg-muted/50 p-3 text-xs">
                            <p><strong>Dirección:</strong> {selectedFuente.direccion}</p>
                            <p><strong>Encargado:</strong> {selectedFuente.encargadoNombre}</p>
                            <p><strong>Tipo:</strong> <span className="font-semibold">{selectedFuente.tipo === 'venta' ? 'Venta' : 'Donación'}</span></p>
                        </Card>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="font-medium">2. Seleccionar Vehículo</label>
                     <Popover open={openVehiculoCombobox} onOpenChange={setOpenVehiculoCombobox}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openVehiculoCombobox}
                            className="w-full justify-between"
                            disabled={isSubmitting || vehiculos.length === 0}
                        >
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                {selectedVehiculoId
                                ? vehiculos.find((v) => v.id === selectedVehiculoId)?.placa
                                : "Seleccione una placa..."}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar placa..." />
                            <CommandList>
                            <CommandEmpty>No se encontró ningún vehículo.</CommandEmpty>
                            <CommandGroup>
                                {vehiculos.map((v) => (
                                <CommandItem
                                    key={v.id}
                                    value={v.placa}
                                    onSelect={() => {
                                        setSelectedVehiculoId(v.id);
                                        setOpenVehiculoCombobox(false);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedVehiculoId === v.id ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {v.placa}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                </div>
              </div>
              
               {collaboratorName && (
                <div className="mt-6">
                    <label className="font-medium text-sm text-foreground/90 flex items-center gap-2">
                        <UserCheck size={16} className="text-primary"/>
                        Gestor Ambiental
                    </label>
                    <div className="mt-2 text-base p-3 border rounded-md bg-muted/50 text-foreground">
                        {collaboratorName}
                    </div>
                </div>
              )}

              <Separator className="my-6" />
              
              {/* Paso 3: Agregar Materiales */}
              <div className="space-y-4">
                  <label className="font-medium block">3. Registrar Materiales Recolectados</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1 md:col-span-2">
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
                    
                    <Button onClick={handleAddItem} disabled={isSubmitting || !selectedMaterialId || !currentPeso} className="md:col-span-3">
                        <Plus className="mr-2 h-4 w-4" /> Agregar Ítem
                    </Button>
                  </div>

                  {currentItems.length > 0 && (
                    <div className="border rounded-md p-2">
                        <div className="flow-root">
                        <ul className="divide-y divide-border">
                            {currentItems.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-background p-2">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} className="text-primary"/>
                                        <div>
                                          <p className="font-medium">{item.materialName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {item.peso} kg
                                            {item.subtotal > 0 && ` @ ${formatCurrency(item.precioUnitario)} = ${formatCurrency(item.subtotal)}`}
                                          </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={isSubmitting} className="h-7 w-7">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                        </div>
                        {totalCurrentValor > 0 && (
                            <>
                                <Separator className="my-2"/>
                                <div className="text-right font-semibold text-lg pr-2">
                                    Total: {formatCurrency(totalCurrentValor)}
                                </div>
                            </>
                        )}
                    </div>
                  )}
              </div>

              <Separator className="my-6" />

              {/* Paso 4: Observaciones */}
              <div className="space-y-2">
                  <label htmlFor="observaciones-input" className="font-medium">4. Observaciones (Opcional)</label>
                  <Textarea
                      id="observaciones-input"
                      placeholder="Añada cualquier nota relevante sobre la recolección..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      disabled={isSubmitting}
                      rows={3}
                  />
              </div>

              {/* Paso 5: Firma y Sello */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                      <label className="font-medium flex items-center gap-2">5. Firma del Encargado <span className="text-destructive">*</span></label>
                      <SignaturePad signatureRef={signatureRef} onSignatureEnd={setFirmaDataUrl} />
                  </div>
                  <div className="space-y-2">
                      <label className="font-medium">6. Foto del Sello (Opcional)</label>
                      <Input id="sello-input" type="file" accept="image/*" capture="environment" onChange={(e) => setSelloFile(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
                      {selloFile && <p className="text-xs text-green-600 flex items-center gap-1 mt-2"><CheckCircle size={14}/> {selloFile.name} listo para subir.</p>}
                      {!selloFile && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><AlertTriangle size={14}/> Sin foto de sello seleccionada.</p>}
                  </div>
              </div>
              
              <Separator />
              
              {/* Paso 6: Guardar */}
              <div className="flex justify-end">
                  <Button onClick={handleSaveRecoleccion} size="lg" disabled={isSubmitting || isLoading || !selectedFuenteId || !selectedVehiculoId || currentItems.length === 0 || !firmaDataUrl}>
                      {isSubmitting ? "Guardando..." : "Guardar Recolección"}
                  </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6 py-8">
                 <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                 <h3 className="text-2xl font-bold">¡Planilla de Recolección Guardada!</h3>
                 <p className="text-muted-foreground">Se ha creado el registro para la recolección en <br/> <span className="font-semibold text-foreground">{lastRecoleccion?.fuenteNombre}</span>.</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                     <Button onClick={handleDownloadPdf} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Descargar Planilla</Button>
                     {isShareSupported && (
                         <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Compartir Planilla</Button>
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
