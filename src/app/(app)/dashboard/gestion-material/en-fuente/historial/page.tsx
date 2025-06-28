
"use client";

import * as React from "react";
import { Printer, Search, Eye, Share2, FileDown, History } from "lucide-react";
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

export default function HistorialRecoleccionesPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, companyProfile: authCompanyProfile } = useAuth();
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
  
  // PDF Generation and Sharing Logic
  const generatePdf = (recoleccionData: RecoleccionDocument) => {
    // This function is copied from RegistrarRecoleccionPage. Can be extracted to a util later.
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 150] });
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
    if (!recoleccionToView) return;
    const pdf = generatePdf(recoleccionToView);
    pdf.save(`recibo_${recoleccionToView.fuenteNombre.replace(/ /g, '_')}_${recoleccionToView.id?.substring(0,5)}.pdf`);
  };

  const handleShare = async () => {
    if (!recoleccionToView || !navigator.share) return;
    try {
        const pdf = generatePdf(recoleccionToView);
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
                    <TableHead className="text-right">Peso Total</TableHead>
                    <TableHead className="text-center w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecolecciones.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{formatDateWithTime(rec.fecha)}</TableCell>
                      <TableCell className="font-medium">{rec.fuenteNombre}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatWeight(rec.totalPeso)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleOpenModal(rec)} aria-label="Ver recibo">
                          <Eye className="h-4 w-4" />
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
                    <h4 className="font-semibold pt-2 border-t">Materiales</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {recoleccionToView.items.map((item, index) => (
                            <li key={index}>{item.materialName}: <strong>{formatWeight(item.peso)}</strong></li>
                        ))}
                    </ul>
                    <h4 className="font-semibold pt-2 border-t">Total Recolectado</h4>
                    <p className="font-bold text-lg text-primary">{formatWeight(recoleccionToView.totalPeso)}</p>

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
