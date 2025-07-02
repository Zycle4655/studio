
"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import type { RecoleccionDocument, RecoleccionItem } from "@/schemas/recoleccion";
import type { CompanyProfileDocument } from "@/schemas/company";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Save, XCircle, FileEdit, Printer, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import Image from "next/image";
import type { Permissions } from "@/schemas/equipo";


export default function EditRecoleccionPage() {
  const router = useRouter();
  const params = useParams();
  const recoleccionId = params.recoleccionId as string;
  const { user, companyOwnerId, permissions } = useAuth();
  const { toast } = useToast();

  const [recoleccion, setRecoleccion] = React.useState<RecoleccionDocument | null>(null);
  const [editableItems, setEditableItems] = React.useState<RecoleccionItem[]>([]);
  const [currentTotal, setCurrentTotal] = React.useState(0);
  const [currentTotalPeso, setCurrentTotalPeso] = React.useState(0);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfileDocument | null>(null);
  const [isLoadingPage, setIsLoadingPage] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);


  React.useEffect(() => {
    if (!companyOwnerId || !recoleccionId) {
      setIsLoadingPage(false);
      if (!companyOwnerId) router.replace("/login");
      return;
    }

    const fetchRecoleccionData = async () => {
      setIsLoadingPage(true);
      try {
        const recoleccionRef = doc(db, "companyProfiles", companyOwnerId, "recolecciones", recoleccionId);
        const recoleccionSnap = await getDoc(recoleccionRef);

        if (recoleccionSnap.exists()) {
          const data = recoleccionSnap.data() as RecoleccionDocument;
          setRecoleccion(data);
          setEditableItems(JSON.parse(JSON.stringify(data.items))); 
          setCurrentTotal(data.totalValor);
          setCurrentTotalPeso(data.totalPeso);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Recolección no encontrada." });
          router.replace("/dashboard/gestion-material/en-fuente/historial");
        }

        const profileRef = doc(db, "companyProfiles", companyOwnerId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        }

      } catch (error) {
        console.error("Error fetching recoleccion for edit:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos para editar." });
      } finally {
        setIsLoadingPage(false);
      }
    };

    fetchRecoleccionData();
  }, [companyOwnerId, recoleccionId, router, toast]);

  const calculateTotal = React.useCallback((items: RecoleccionItem[]) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, []);

  React.useEffect(() => {
    setCurrentTotal(calculateTotal(editableItems));
    setCurrentTotalPeso(editableItems.reduce((sum, item) => sum + item.peso, 0));
  }, [editableItems, calculateTotal]);


  const handleItemFieldChange = (index: number, field: keyof RecoleccionItem, value: string | number) => {
    const newItems = [...editableItems];
    const itemToUpdate = { ...newItems[index] };

    if (field === "peso" || field === "precioUnitario") {
      const numericValue = typeof value === 'string' ? parseFloat(value.replace(",", ".")) : value; 
      itemToUpdate[field] = isNaN(numericValue) || numericValue < 0 ? 0 : numericValue;
    }
    
    itemToUpdate.subtotal = (itemToUpdate.peso || 0) * (itemToUpdate.precioUnitario || 0);
    newItems[index] = itemToUpdate;
    setEditableItems(newItems);
  };
  
  const handleUpdateRecoleccion = async () => {
    if (!companyOwnerId || !recoleccion || !recoleccionId || !db) return;
    setIsSaving(true);
    
    try {
      const recoleccionRef = doc(db, "companyProfiles", companyOwnerId, "recolecciones", recoleccionId);
      const finalTotalValor = calculateTotal(editableItems);
      const finalTotalPeso = editableItems.reduce((sum, item) => sum + item.peso, 0);
      
      const updatedData: Partial<RecoleccionDocument> = {
        items: editableItems,
        totalValor: finalTotalValor,
        totalPeso: finalTotalPeso,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(recoleccionRef, updatedData);

      toast({ title: "Recolección Actualizada", description: "Los detalles de la recolección han sido actualizados." });
      router.push("/dashboard/gestion-material/en-fuente/historial");

    } catch (error) {
      console.error("Error updating recoleccion:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la recolección." });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const formatWeight = (value: number) => {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  const formatDate = (dateValue: Timestamp | Date | undefined): string => {
    if (!dateValue) return "N/A";
    const date = dateValue instanceof Timestamp ? dateValue.toDate() : dateValue;
    return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }); 
  };
  
  const generatePdf = (recoleccionData: RecoleccionDocument, profileData: CompanyProfileDocument | null, permissions: Permissions | null) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const showPrices = permissions?.equipo && calculateTotal(editableItems) > 0;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;
    
    const companyName = profileData?.companyName || 'Nombre de la Empresa';
    const companyNit = profileData?.nit || 'NIT no especificado';
    const companyAddress = profileData?.address || 'Dirección no especificada';
    const companyPhone = profileData?.phone || 'Teléfono no especificado';
    const logoUrl = profileData?.logoUrl;

    // --- Header ---
    if (logoUrl) {
        try {
            const url = new URL(logoUrl);
            const pathName = decodeURIComponent(url.pathname);
            let extension = pathName.substring(pathName.lastIndexOf('.') + 1).toUpperCase();
            if (extension === "JPG") { extension = "JPEG"; }
            doc.addImage(logoUrl, extension, margin, y, 30, 30, undefined, 'FAST');
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
        }
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth - margin, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`NIT: ${companyNit}`, pageWidth - margin, y + 10, { align: 'right' });
    doc.text(companyAddress, pageWidth - margin, y + 15, { align: 'right' });
    doc.text(`Tel: ${companyPhone}`, pageWidth - margin, y + 20, { align: 'right' });

    y += 45;

    // --- Title ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(showPrices ? "COMPROBANTE DE COMPRA EN FUENTE" : "CERTIFICADO DE RECOLECCIÓN", pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("Certificado Final", pageWidth / 2, y + 6, { align: 'center' });
    
    y += 20;

    // --- Certificate Body ---
    doc.setFontSize(11);
    const introText = showPrices
        ? `Por medio de la presente, la empresa ${companyName} certifica que ha comprado los siguientes materiales de:`
        : `Por medio de la presente, la empresa ${companyName} certifica que ha recibido en donación los siguientes materiales de:`;
    const splitText = doc.splitTextToSize(introText, pageWidth - margin * 2);
    doc.text(splitText, margin, y);
    y += (splitText.length * 5) + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Fuente:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(recoleccionData.fuenteNombre, margin + 25, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Encargado:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(recoleccionData.encargadoNombre, margin + 25, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Gestor Ambiental:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(recoleccionData.registradoPorNombre || "No especificado", margin + 40, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(recoleccionData.fecha), margin + 25, y);
    if (recoleccionData.vehiculoPlaca) {
        y += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Vehículo:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(recoleccionData.vehiculoPlaca, margin + 25, y);
    }
    y += 15;
    
    // --- Materials Table ---
    const tableHeaders = ['Material', 'Peso (kg)'];
    if (showPrices) {
        tableHeaders.push('Vr. Unitario', 'Subtotal');
    }

    const tableData = editableItems.map(item => {
        const row = [item.materialName, item.peso.toFixed(2)];
        if(showPrices) {
            row.push(formatCurrency(item.precioUnitario), formatCurrency(item.subtotal));
        }
        return row;
    });

    (doc as any).autoTable({
        startY: y,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Totals ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const finalTotalPeso = editableItems.reduce((sum, item) => sum + item.peso, 0);
    if (showPrices) {
        doc.text(`Total Compra: ${formatCurrency(calculateTotal(editableItems))}`, pageWidth - margin, y, { align: 'right' });
        y += 7;
    }
    doc.text(`Peso Total: ${finalTotalPeso.toFixed(2)} kg`, pageWidth - margin, y, { align: 'right' });
    y += 25;

    // --- Signature ---
    if (y > pageHeight - 50) {
        doc.addPage();
        y = margin;
    }
    doc.addImage(recoleccionData.firmaDataUrl, 'PNG', (pageWidth / 2) - 40, y, 80, 30, undefined, 'FAST');
    y += 30;
    doc.line(margin + 50, y, pageWidth - margin - 50, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma del Encargado', pageWidth / 2, y + 5, { align: 'center' });
    doc.text(recoleccionData.encargadoNombre, pageWidth / 2, y + 10, { align: 'center' });


    return doc;
  };

  const handleDownloadPdf = () => {
    if (!recoleccion) return;
    // Create a temporary doc with the edited items for PDF generation
    const tempDocForPdf = {
      ...recoleccion,
      items: editableItems,
      totalValor: currentTotal,
    };
    const pdf = generatePdf(tempDocForPdf, companyProfile, permissions);
    pdf.save(`certificado_final_${recoleccion.id?.substring(0,8)}.pdf`);
  };


  if (isLoadingPage) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <Card className="shadow-lg"><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!recoleccion || !permissions?.gestionMaterial) {
    return (
        <div className="container py-8 px-4 md:px-6 text-center">
            <p>Recolección no encontrada o no tiene permisos para ver esta página.</p>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <FileEdit className="mr-3 h-7 w-7" />
            Editar Recolección en Fuente
          </CardTitle>
          <CardDescription>
            Ajuste los pesos y precios de los materiales recolectados. Los cambios se guardarán permanentemente.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 mb-6 text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
                <p><strong>Fuente:</strong> {recoleccion.fuenteNombre}</p>
                <p><strong>Fecha:</strong> {formatDate(recoleccion.fecha)}</p>
                {recoleccion.registradoPorNombre && (
                    <p><strong>Gestor Ambiental:</strong> {recoleccion.registradoPorNombre}</p>
                )}
                <p><strong>Vehículo:</strong> {recoleccion.vehiculoPlaca || 'N/A'}</p>
            </div>
            
            <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right w-40">Peso (kg)</TableHead>
                    {permissions?.equipo && (
                        <>
                            <TableHead className="text-right w-48">Precio Unit. (COP)</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                        </>
                    )}
                </TableRow>
                </TableHeader>
                <TableBody>
                {editableItems.map((item, index) => (
                    <TableRow key={item.materialId + index}>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell>
                        <Input
                        type="number"
                        value={String(item.peso ?? "")}
                        onChange={(e) => handleItemFieldChange(index, "peso", e.target.value)}
                        className="h-9 text-right"
                        step="0.01"
                        min="0.01"
                        disabled={isSaving}
                        />
                    </TableCell>
                    {permissions?.equipo && (
                        <>
                            <TableCell>
                                <Input
                                type="number"
                                value={String(item.precioUnitario ?? "")}
                                onChange={(e) => handleItemFieldChange(index, "precioUnitario", e.target.value)}
                                className="h-9 text-right"
                                step="1"
                                min="0"
                                disabled={isSaving || !permissions?.equipo}
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        </>
                    )}
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
             <div className="mt-4 text-right space-y-1">
                <p className="font-semibold">Peso Total: {formatWeight(currentTotalPeso)} kg</p>
                {permissions?.equipo && (
                    <p className="text-xl font-bold">Total Compra: {formatCurrency(currentTotal)}</p>
                )}
            </div>

        </CardContent>
        <CardFooter className="pt-8 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
             <Button type="button" variant="secondary" onClick={handleDownloadPdf} disabled={isSaving || !recoleccion}>
                <Printer className="mr-2 h-4 w-4"/>
                Descargar planilla
            </Button>
            <Button type="button" onClick={handleUpdateRecoleccion} disabled={isSaving || isLoadingPage}>
                {isSaving ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
