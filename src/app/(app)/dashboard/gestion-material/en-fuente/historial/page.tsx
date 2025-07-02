
"use client";

import * as React from "react";
import { Printer, Search, Eye, Share2, FileDown, History, Truck, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import type { RecoleccionDocument } from "@/schemas/recoleccion";
import type { CompanyProfileDocument } from "@/schemas/company";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { useRouter } from "next/navigation";

export default function HistorialRecoleccionesPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, companyProfile: authCompanyProfile, permissions } = useAuth();
  const router = useRouter();
  const [recolecciones, setRecolecciones] = React.useState<RecoleccionDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfileDocument | null>(authCompanyProfile);
  
  const [recoleccionToView, setRecoleccionToView] = React.useState<RecoleccionDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isShareSupported, setIsShareSupported] = React.useState(false);

  React.useEffect(() => {
    if (navigator.share) {
        setIsShareSupported(true);
    }
  }, []);

  const fetchRecoleccionesAndProfile = React.useCallback(async () => {
    if (!companyOwnerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const recoleccionesRef = collection(db, "companyProfiles", companyOwnerId, "recolecciones");
      const q = query(recoleccionesRef, orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const recoleccionesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecoleccionDocument));
      setRecolecciones(recoleccionesList);

      if (!companyProfile) {
        const profileRef = doc(db, "companyProfiles", companyOwnerId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los registros de recolección." });
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, companyProfile, toast]);

  React.useEffect(() => {
    document.title = 'Historial de Recolecciones | ZYCLE';
    if (companyOwnerId) {
      fetchRecoleccionesAndProfile();
    } else {
      setIsLoading(false);
    }
  }, [companyOwnerId, fetchRecoleccionesAndProfile]);

  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
  };
  
   const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateWithTime = (timestamp: Timestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }); 
  };

  const handleOpenModal = (recoleccion: RecoleccionDocument) => {
    setRecoleccionToView(recoleccion);
    setIsModalOpen(true);
  };
  
  const filteredRecolecciones = recolecciones.filter(rec =>
    rec.fuenteNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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
            const response = await fetch(profileData.logoUrl);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const imgProps = doc.getImageProperties(dataUrl);
            const imgWidth = 40;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            doc.addImage(dataUrl, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight, undefined, 'FAST');
            y += imgHeight + 5;
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
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
    doc.text(formatDateWithTime(recoleccionData.fecha), margin + 45, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('FUENTE:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(recoleccionData.fuenteNombre, margin + 45, y);
    y += 7;

    if (recoleccionData.vehiculoPlaca) {
        doc.setFont('helvetica', 'bold');
        doc.text('PLACA DEL VEHÍCULO:', margin, y);
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
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 12 },
        headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
        didDrawPage: (data: any) => { y = data.cursor.y; }
    });
    y = (doc as any).lastAutoTable.finalY + 15;

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
    doc.setFont('helvetica', 'normal');
    doc.text(recoleccionData.encargadoNombre, margin, y);

    return doc;
  };

  const handleDownloadPdf = async () => {
    if (!recoleccionToView) return;
    const pdf = await generatePdf(recoleccionToView, companyProfile);
    pdf.save(`recibo_${recoleccionToView.fuenteNombre.replace(/ /g, '_')}_${recoleccionToView.id?.substring(0,5)}.pdf`);
  };

  const handleShare = async () => {
    if (!recoleccionToView || !navigator.share) return;
    try {
        const pdf = await generatePdf(recoleccionToView, companyProfile);
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `recibo_${recoleccionToView.fuenteNombre.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });
        
        await navigator.share({
            title: `Recibo de Recolección - ${companyProfile?.companyName || ''}`,
            text: `Adjunto el recibo de la recolección en ${recoleccionToView.fuenteNombre}.`,
            files: [pdfFile],
        });
    } catch (error) {
        console.error("Error al compartir:", error);
        toast({ variant: 'destructive', title: 'Error al compartir', description: 'No se pudo compartir el archivo.' });
    }
  };
  
  const handleEdit = (recoleccionId: string) => {
    router.push(`/dashboard/gestion-material/en-fuente/${recoleccionId}/edit`);
  };

  if (isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2"/>
                    <Skeleton className="h-5 w-1/2"/>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-md"/>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <History className="mr-3 h-7 w-7" />
                Historial de Recolecciones
              </CardTitle>
              <CardDescription>
                Consulte y gestione los registros de recolección en fuente.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de fuente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                 <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="space-y-1"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32" /></div>
                    <div className="flex items-center space-x-2"><Skeleton className="h-8 w-8 rounded-md" /></div>
                </div>
              ))}
            </div>
          ) : recolecciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay recolecciones registradas</h3>
              <p className="text-muted-foreground">Cuando registre una recolección en fuente, aparecerá aquí.</p>
            </div>
          ) : filteredRecolecciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
              <p className="text-muted-foreground">Ninguna recolección coincide con su búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead className="text-right">Peso Total</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecolecciones.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{formatDateWithTime(rec.fecha)}</TableCell>
                      <TableCell className="font-medium">{rec.fuenteNombre}</TableCell>
                      <TableCell>{rec.vehiculoPlaca || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatWeight(rec.totalPeso)}</TableCell>
                       <TableCell className="text-right font-semibold text-green-600">{rec.totalValor > 0 ? formatCurrency(rec.totalValor) : "Donación"}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(rec)} aria-label="Ver recibo">
                          <Eye className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(rec.id!)} aria-label="Editar recolección">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {recoleccionToView && (
         <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md"> 
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <FileDown className="mr-2 h-6 w-6 text-primary"/>
                        Recibo de Recolección
                    </DialogTitle>
                    <DialogDescription>
                        Detalles del registro para: {recoleccionToView.fuenteNombre}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div><strong>Fecha:</strong> {formatDateWithTime(recoleccionToView.fecha)}</div>
                    <div><strong>Encargado:</strong> {recoleccionToView.encargadoNombre}</div>
                    {recoleccionToView.registradoPorNombre && (
                      <div><strong>Gestor Ambiental:</strong> {recoleccionToView.registradoPorNombre}</div>
                    )}
                    {recoleccionToView.vehiculoPlaca && (
                      <div><strong>Vehículo:</strong> {recoleccionToView.vehiculoPlaca}</div>
                    )}
                    <h4 className="font-semibold pt-2 border-t">Materiales</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {recoleccionToView.items.map((item, index) => (
                           <li key={index}>
                            {item.materialName}: <strong>{formatWeight(item.peso)}</strong>
                            {item.subtotal > 0 && <span className="text-muted-foreground"> ({formatCurrency(item.subtotal)})</span>}
                           </li>
                        ))}
                    </ul>
                     <h4 className="font-semibold pt-2 border-t">Totales</h4>
                    {recoleccionToView.totalValor > 0 && (
                      <p className="font-bold text-lg text-green-600">Total Compra: {formatCurrency(recoleccionToView.totalValor)}</p>
                    )}
                    <p className="font-bold text-lg text-primary">Peso Total: {formatWeight(recoleccionToView.totalPeso)}</p>

                    <h4 className="font-semibold pt-2 border-t">Firma</h4>
                    <div className="border rounded-md p-2 bg-muted flex justify-center">
                        <Image src={recoleccionToView.firmaDataUrl} alt="Firma del encargado" width={200} height={80} style={{ objectFit: 'contain' }} />
                    </div>

                    {recoleccionToView.selloImageUrl && (
                        <>
                            <h4 className="font-semibold pt-2 border-t">Sello</h4>
                            <div className="border rounded-md p-2 bg-muted flex justify-center">
                                <Image src={recoleccionToView.selloImageUrl} alt="Sello adjunto" width={200} height={150} style={{ objectFit: 'contain' }} />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter className="mt-4 flex-wrap justify-center gap-2">
                    <Button onClick={handleDownloadPdf} variant="outline"><FileDown className="mr-2 h-4 w-4"/>Descargar PDF</Button>
                     {isShareSupported && (
                         <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Compartir</Button>
                     )}
                    <DialogClose asChild><Button type="button" variant="secondary">Cerrar</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </div>
  );
}
