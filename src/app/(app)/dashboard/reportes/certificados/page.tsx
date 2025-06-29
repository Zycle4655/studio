
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

import type { RecoleccionDocument } from "@/schemas/recoleccion";
import type { FuenteDocument } from "@/schemas/fuente";
import { FileBadge, Search, FileDown, ArrowLeft, Calendar, BarChartHorizontalBig, Package } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface ReportData {
  fuente: FuenteDocument;
  periodo: string;
  totalPeso: number;
  materiales: { name: string; peso: number }[];
}

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const date = subMonths(now, i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy", { locale: es });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

export default function CertificadosFuentePage() {
  const { companyOwnerId, companyProfile } = useAuth();
  const { toast } = useToast();

  const [fuentes, setFuentes] = React.useState<FuenteDocument[]>([]);
  const [selectedFuenteId, setSelectedFuenteId] = React.useState<string>("");
  const [selectedMonth, setSelectedMonth] = React.useState<string>("");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);
  const chartRef = React.useRef<HTMLDivElement>(null);


  React.useEffect(() => {
    document.title = 'Reporte: Certificados por Fuente | ZYCLE';
    if (companyOwnerId) {
      const fetchFuentes = async () => {
        setIsLoading(true);
        try {
          const fuentesRef = collection(db, "companyProfiles", companyOwnerId, "fuentes");
          const q = query(fuentesRef, orderBy("nombre", "asc"));
          const querySnapshot = await getDocs(q);
          const fuentesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuenteDocument));
          setFuentes(fuentesList);
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las fuentes." });
        } finally {
          setIsLoading(false);
        }
      };
      fetchFuentes();
    }
  }, [companyOwnerId, toast]);

  const handleGenerateReport = async () => {
    if (!companyOwnerId || !selectedFuenteId || !selectedMonth) {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "Por favor, seleccione una fuente y un mes." });
      return;
    }
    setIsGenerating(true);
    setReportData(null);
    try {
      const fuente = fuentes.find(f => f.id === selectedFuenteId);
      if (!fuente) throw new Error("Fuente no encontrada");

      const [year, month] = selectedMonth.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, 1);
      const startDate = Timestamp.fromDate(startOfMonth(selectedDate));
      const endDate = Timestamp.fromDate(endOfMonth(selectedDate));
      const periodoLabel = format(selectedDate, "MMMM 'de' yyyy", { locale: es });

      const recoleccionesRef = collection(db, "companyProfiles", companyOwnerId, "recolecciones");
      const q = query(
        recoleccionesRef,
        where("fuenteId", "==", selectedFuenteId),
        where("fecha", ">=", startDate),
        where("fecha", "<=", endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const recolecciones = querySnapshot.docs.map(doc => doc.data() as RecoleccionDocument);

      if (recolecciones.length === 0) {
        toast({ title: "Sin Datos", description: `No se encontraron recolecciones para ${fuente.nombre} en ${periodoLabel}.` });
        setReportData({ fuente, periodo: periodoLabel, totalPeso: 0, materiales: [] });
        return;
      }
      
      const materialTotals = new Map<string, number>();
      recolecciones.forEach(rec => {
        rec.items.forEach(item => {
          const currentTotal = materialTotals.get(item.materialName) || 0;
          materialTotals.set(item.materialName, currentTotal + item.peso);
        });
      });
      
      const materiales = Array.from(materialTotals.entries()).map(([name, peso]) => ({ name, peso })).sort((a,b) => b.peso - a.peso);
      const totalPeso = materiales.reduce((sum, item) => sum + item.peso, 0);

      setReportData({ fuente, periodo: periodoLabel, totalPeso, materiales });

    } catch (error) {
      console.error("Error generating report:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte." });
    } finally {
      setIsGenerating(false);
    }
  };
  
   const generatePdf = async () => {
    if (!reportData || !companyProfile || !chartRef.current) {
        toast({ variant: "destructive", title: "Error", description: "No hay datos para generar el PDF." });
        return;
    }
    
    // --- 1. Capture chart as an image ---
    const canvas = await html2canvas(chartRef.current, { backgroundColor: null }); // transparent background
    const chartImgData = canvas.toDataURL('image/png');
    const chartWidth = 180;
    const chartHeight = (canvas.height * chartWidth) / canvas.width;
    
    // --- 2. Create PDF document ---
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;
    
    // --- Header ---
    if (companyProfile.logoUrl) {
      try {
        const url = new URL(companyProfile.logoUrl);
        const pathName = decodeURIComponent(url.pathname);
        let extension = pathName.substring(pathName.lastIndexOf('.') + 1).toUpperCase();
        if (extension === "JPG") extension = "JPEG";
        doc.addImage(companyProfile.logoUrl, extension, margin, y, 30, 30, undefined, 'FAST');
      } catch (e) { console.error("Error adding logo to PDF:", e); }
    }
    
    doc.setFontSize(10).setFont('helvetica', 'bold').text(companyProfile.companyName, pageWidth - margin, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(`NIT: ${companyProfile.nit}`, pageWidth - margin, y + 10, { align: 'right' });
    doc.text(companyProfile.address, pageWidth - margin, y + 15, { align: 'right' });
    doc.text(`Tel: ${companyProfile.phone}`, pageWidth - margin, y + 20, { align: 'right' });
    
    y += 45;

    // --- Title ---
    doc.setFontSize(18).setFont('helvetica', 'bold').text("Certificado de Aprovechamiento", pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // --- Certificate Body ---
    doc.setFontSize(11).setFont('helvetica', 'normal');
    const certText = `Por medio de la presente, la empresa ${companyProfile.companyName} certifica que la fuente generadora:`;
    doc.text(certText, margin, y);
    y += 8;
    
    doc.setFont('helvetica', 'bold').text(reportData.fuente.nombre, pageWidth / 2, y, { align: 'center' });
    y += 8;

    const totalKilos = reportData.totalPeso.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const periodText = `durante el período de ${reportData.periodo}, entregó para su aprovechamiento un total de ${totalKilos} kg de material, discriminados de la siguiente manera:`;
    const splitText = doc.splitTextToSize(periodText, pageWidth - (margin * 2));
    doc.text(splitText, margin, y);
    y += (splitText.length * 5) + 8;
    
    // --- Materials Table ---
    (doc as any).autoTable({
        startY: y,
        head: [['Material', 'Peso (kg)']],
        body: reportData.materiales.map(m => [m.name, m.peso.toFixed(2)]),
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Primary color
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // --- Chart ---
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Gráfico de Composición', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.addImage(chartImgData, 'PNG', (pageWidth - chartWidth) / 2, y, chartWidth, chartHeight);
    y += chartHeight + 15;
    
    // --- Footer ---
    if (y > doc.internal.pageSize.getHeight() - 30) doc.addPage();
    const finalDate = format(new Date(), "'Expedido en' d 'de' MMMM 'de' yyyy", { locale: es });
    doc.setFontSize(10).setFont('helvetica', 'normal').text(finalDate, pageWidth / 2, y, { align: 'center' });

    // --- Save PDF ---
    doc.save(`Certificado_${reportData.fuente.nombre.replace(/ /g, '_')}_${reportData.periodo.replace(/ /g, '_')}.pdf`);
  };

  const formatWeight = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
           <Skeleton className="h-10 w-64 mb-4" />
           <Skeleton className="h-10 w-48" />
        </div>
      );
    }
    
    if (reportData) {
      return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <Button onClick={() => setReportData(null)} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Generar Nuevo Reporte
                </Button>
                <Button onClick={generatePdf} disabled={!reportData || reportData.materiales.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" /> Descargar Certificado
                </Button>
            </div>
            {reportData.materiales.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5 text-primary"/>Distribución de Materiales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div ref={chartRef} className="h-80 bg-background p-2">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={reportData.materiales} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" hide />
                                  <YAxis type="category" dataKey="name" width={150} stroke="#888888" fontSize={12} />
                                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => [`${formatWeight(value)} kg`, "Peso"]} />
                                  <Bar dataKey="peso" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Peso" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-6">
                        <Card>
                             <CardHeader className="pb-2">
                                <CardDescription>Fuente Analizada</CardDescription>
                                <CardTitle className="text-xl">{reportData.fuente.nombre}</CardTitle>
                             </CardHeader>
                             <CardContent><p className="text-sm text-muted-foreground">{reportData.periodo}</p></CardContent>
                        </Card>
                         <Card>
                             <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-medium flex items-center">
                                    <Package className="mr-2 h-5 w-5 text-primary"/> Total Aprovechado
                                </CardTitle>
                             </CardHeader>
                             <CardContent><p className="text-3xl font-bold text-primary">{formatWeight(reportData.totalPeso)} kg</p></CardContent>
                        </Card>
                    </div>
                     <Card className="lg:col-span-3">
                        <CardHeader><CardTitle>Detalle por Material</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Peso (kg)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {reportData.materiales.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{formatWeight(item.peso)}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No se encontraron recolecciones para la fuente y el período seleccionados.</p>
                </div>
            )}
        </div>
      );
    }
    
    // Initial view: filters
    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <h3 className="text-lg font-medium">Seleccione Fuente y Período</h3>
            <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedFuenteId} onValueChange={setSelectedFuenteId} disabled={fuentes.length === 0}>
                    <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Seleccione una fuente..." /></SelectTrigger>
                    <SelectContent>
                        {fuentes.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Seleccione un mes" /></div>
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={isGenerating || !selectedFuenteId || !selectedMonth}>
                {isGenerating ? "Generando..." : <><Search className="mr-2 h-4 w-4" /> Generar Reporte</>}
            </Button>
        </div>
    );

  };

  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <FileBadge className="mr-3 h-7 w-7" />
            Generador de Certificados por Fuente
          </CardTitle>
          <CardDescription>
            Genere un certificado de aprovechamiento mensual consolidado para una fuente específica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
