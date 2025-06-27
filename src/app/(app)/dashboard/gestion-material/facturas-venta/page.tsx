
"use client";

import * as React from "react";
import { Printer, Edit, Store, PackageSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import type { FacturaVentaDocument } from "@/schemas/venta";
import type { CompanyProfileDocument } from "@/schemas/company";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation"; 

export default function FacturasVentaPage() {
  const { toast } = useToast();
  const { user, companyOwnerId } = useAuth();
  const router = useRouter(); 
  const [invoices, setInvoices] = React.useState<FacturaVentaDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfileDocument | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  const [invoiceToPrint, setInvoiceToPrint] = React.useState<FacturaVentaDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const getSaleInvoicesCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "saleInvoices");
  }, [companyOwnerId]);

  const getCompanyProfileRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return doc(db, "companyProfiles", companyOwnerId);
  }, [companyOwnerId]);


  const fetchInvoicesAndProfile = React.useCallback(async () => {
    if (!companyOwnerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesRef = getSaleInvoicesCollectionRef();
      if (invoicesRef) {
        const q = query(invoicesRef, orderBy("numeroFactura", "desc"));
        const querySnapshot = await getDocs(q);
        const invoicesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacturaVentaDocument));
        setInvoices(invoicesList);
      }

      const profileRef = getCompanyProfileRef();
      if (profileRef) {
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        }
      }
      if (user) {
        setUserEmail(user.email);
      }

    } catch (error) {
      console.error("Error fetching invoices or profile:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las facturas o el perfil." });
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, user, getSaleInvoicesCollectionRef, getCompanyProfileRef, toast]);

  React.useEffect(() => {
    document.title = 'Facturas de Venta | ZYCLE';
    if (companyOwnerId) {
      fetchInvoicesAndProfile();
    } else {
      setInvoices([]);
      setCompanyProfile(null);
      setUserEmail(null);
      setIsLoading(false);
    }
  }, [companyOwnerId, fetchInvoicesAndProfile]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDateWithTime = (timestamp: Timestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "PPPp", { locale: es }); 
  };

  const handleOpenPrintModal = (invoice: FacturaVentaDocument) => {
    setInvoiceToPrint(invoice);
    setIsPrintModalOpen(true);
  };
  
  const handleEditInvoice = (invoiceId: string | undefined) => {
    if(!invoiceId) return;
    router.push(`/dashboard/gestion-material/facturas-venta/${invoiceId}/edit`);
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-print-content-modal");
    if (previewElement && invoiceToPrint && companyProfile) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura Venta N° '+ invoiceToPrint.numeroFactura +'</title>');
      
      const stylesHtml = `
        <style>
          body { font-family: 'Arial', sans-serif; margin: 5px; color: #000; background-color: #fff; font-size: 10px; max-width: 280px; padding: 0; }
          .invoice-header { text-align: center; margin-bottom: 8px; }
          .invoice-header img { max-height: 40px; margin-bottom: 5px; object-fit: contain; }
          .invoice-header h1 { margin: 0; font-size: 1.1em; font-weight: bold; }
          .invoice-header p { margin: 1px 0; font-size: 0.8em; }
          .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 3px; font-size: 0.9em; text-align: center; border-top: 1px dashed #555; border-bottom: 1px dashed #555; padding: 2px 0;}
          .invoice-info { margin-bottom: 8px; font-size: 0.85em;}
          .invoice-info p { margin: 2px 0; display: flex; justify-content: space-between; }
          .invoice-info p span:first-child { font-weight: bold; margin-right: 5px;}
          .user-details p { margin: 2px 0; font-size: 0.85em; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 0.85em; }
          .items-table th, .items-table td { border-bottom: 1px solid #eee; padding: 3px 1px; text-align: left; }
          .items-table th { font-weight: bold; background-color: transparent; }
          .items-table .text-right { text-align: right !important; }
          .items-table .col-material { width: 45%; }
          .items-table .col-peso, .items-table .col-vunit, .items-table .col-subtotal { width: 18.33%; }
          .total-section { margin-top: 10px; text-align: right; font-size: 1em; }
          .total-section p { margin: 3px 0; font-weight: bold; }
          .total-section .total-amount { font-size: 1.1em; }
          .payment-method { font-size: 0.85em; margin-top: 5px; text-align: left; }
          .footer-notes { margin-top: 10px; font-size: 0.75em; border-top: 1px solid #eee; padding-top: 5px; text-align: center; }
          @media print { body { margin: 0; padding:0; max-width: 100%; } .items-table th, .items-table td { font-size: 0.8em; padding: 2px 1px;} .invoice-header h1 { font-size: 1em; } .section-title { font-size: 0.85em; } }
        </style>`;
      printWindow.document.write(stylesHtml);
      printWindow.document.write('</head><body>');
      
      let printHtml = '<div class="invoice-header">';
      if (companyProfile?.logoUrl) {
        printHtml += `<img src="${companyProfile.logoUrl}" alt="Logo de ${companyProfile.companyName}" style="max-height: 40px; margin-bottom: 5px; object-fit: contain; display: block; margin-left: auto; margin-right: auto;" data-ai-hint="logo company" />`;
      }
      printHtml += `<h1>${companyProfile?.companyName || "Nombre Empresa"}</h1>`;
      if (companyProfile?.nit) printHtml += `<p>NIT: ${companyProfile.nit}</p>`;
      if (companyProfile?.address) printHtml += `<p>${companyProfile.address}</p>`;
      if (companyProfile?.phone) printHtml += `<p>Tel: ${companyProfile.phone}</p>`;
      if (userEmail) printHtml += `<p>Email: ${userEmail}</p>`;
      printHtml += '</div>';

      printHtml += '<div class="invoice-info">';
      printHtml += `<p><span>Factura Venta N°:</span> <span style="font-weight: bold;">${invoiceToPrint.numeroFactura}</span></p>`;
      printHtml += `<p><span>Fecha y Hora:</span> <span>${formatDateWithTime(invoiceToPrint.fecha)}</span></p>`;
      printHtml += '</div>';

      if (invoiceToPrint.clienteNombre) {
        printHtml += '<div class="section-title">Cliente</div>';
        printHtml += `<div class="user-details"><p>${invoiceToPrint.clienteNombre}</p></div>`;
      }

      printHtml += '<div class="section-title">Detalle de la Venta</div>';
      printHtml += '<table class="items-table"><thead><tr><th class="col-material">Material</th><th class="col-peso text-right">Peso</th><th class="col-vunit text-right">Vr. Unit.</th><th class="col-subtotal text-right">Subtotal</th></tr></thead><tbody>';
      invoiceToPrint.items.forEach(item => {
        printHtml += `<tr><td class="col-material">${item.materialName}${item.materialCode ? ` (${item.materialCode})` : ''}</td><td class="col-peso text-right">${item.peso.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td><td class="col-vunit text-right">${formatCurrency(item.precioUnitario)}</td><td class="col-subtotal text-right">${formatCurrency(item.subtotal)}</td></tr>`;
      });
      printHtml += '</tbody></table>';

      printHtml += `<div class="total-section"><p>TOTAL FACTURA: <span class="total-amount">${formatCurrency(invoiceToPrint.totalFactura)}</span></p></div>`;
      
      if (invoiceToPrint.formaDePago) {
          printHtml += `<p class="payment-method"><strong>Forma de Pago:</strong> <span style="text-transform: capitalize;">${invoiceToPrint.formaDePago}</span></p>`;
      }

      if (invoiceToPrint.observaciones) {
        printHtml += `<div class="footer-notes"><p><strong>Observaciones:</strong> ${invoiceToPrint.observaciones}</p></div>`;
      }
      
      printWindow.document.write(printHtml);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 250);
    } else {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo generar la vista previa. Datos de factura o perfil incompletos."})
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const term = searchTerm.toLowerCase();
    const numberMatch = String(invoice.numeroFactura).includes(term);
    const clientMatch = invoice.clienteNombre ? invoice.clienteNombre.toLowerCase().includes(term) : false;
    return numberMatch || clientMatch;
  });

  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Facturas de Venta</CardTitle>
                    <CardDescription>Por favor, inicie sesión para ver sus facturas.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">Debe iniciar sesión para ver esta página.</p>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="container py-8 px-4 md:px-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <Store className="mr-3 h-7 w-7" />
                Historial de Facturas de Venta
                </CardTitle>
                <CardDescription>
                Consulte, imprima o gestione sus facturas de venta de materiales.
                </CardDescription>
            </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por N° o cliente..."
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
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-24" /> 
                        <Skeleton className="h-4 w-32" /> 
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay facturas de venta registradas</h3>
              <p className="text-muted-foreground">Cuando registre una venta, aparecerá aquí.</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
                <p className="text-muted-foreground">Ninguna factura coincide con "{searchTerm}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">N° Factura</TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total (COP)</TableHead>
                    <TableHead className="text-center w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.numeroFactura}</TableCell>
                      <TableCell>{formatDateWithTime(invoice.fecha)}</TableCell>
                      <TableCell>{invoice.clienteNombre || "N/A"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalFactura)}</TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-green-600"
                          onClick={() => handleOpenPrintModal(invoice)}
                          aria-label="Imprimir factura"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-amber-600"
                          onClick={() => handleEditInvoice(invoice.id)}
                          aria-label="Editar factura"
                        >
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

      {invoiceToPrint && (
         <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogContent className="max-w-md"> 
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Printer className="mr-2 h-6 w-6 text-primary"/>
                        Imprimir Factura N° {invoiceToPrint.numeroFactura}
                    </DialogTitle>
                    <DialogDescription>
                        Revise la factura antes de imprimir.
                    </DialogDescription>
                </DialogHeader>
                <div id="factura-print-content-modal" className="p-1 border rounded-md bg-background text-xs max-h-[70vh] overflow-y-auto my-4">
                    <div className="invoice-header">
                        {companyProfile?.logoUrl && (
                            <Image 
                                src={companyProfile.logoUrl} 
                                alt={`Logo de ${companyProfile.companyName}`} 
                                width={60} 
                                height={40} 
                                className="mx-auto mb-1 object-contain"
                                data-ai-hint="logo company"
                            />
                        )}
                        <h1 className="text-base font-bold">{companyProfile?.companyName || "Nombre Empresa"}</h1>
                        {companyProfile?.nit && <p>NIT: {companyProfile.nit}</p>}
                        {companyProfile?.address && <p>{companyProfile.address}</p>}
                        {companyProfile?.phone && <p>Tel: {companyProfile.phone}</p>}
                        {userEmail && <p>Email: {userEmail}</p>}
                    </div>
                    
                    <div className="invoice-info mt-2">
                        <p><span>Factura Venta N°:</span> <span className="font-semibold">{invoiceToPrint.numeroFactura}</span></p>
                        <p><span>Fecha y Hora:</span> <span>{formatDateWithTime(invoiceToPrint.fecha)}</span></p>
                    </div>
                    
                    {invoiceToPrint.clienteNombre && (
                        <>
                        <div className="section-title mt-2">Cliente</div>
                        <div className="user-details my-1">
                            <p>{invoiceToPrint.clienteNombre}</p>
                        </div>
                        </>
                    )}

                    <div className="section-title mt-2">Detalle de Venta</div>
                    <div className="overflow-x-auto">
                        <table className="items-table w-full">
                        <thead>
                            <tr>
                            <th className="col-material">Material</th>
                            <th className="col-peso text-right">Peso</th>
                            <th className="col-vunit text-right">Vr. Unit.</th>
                            <th className="col-subtotal text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceToPrint.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                                <td className="col-material">{item.materialName} {item.materialCode && `(${item.materialCode})`}</td>
                                <td className="col-peso text-right">{item.peso.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="col-vunit text-right">{formatCurrency(item.precioUnitario)}</td>
                                <td className="col-subtotal text-right">{formatCurrency(item.subtotal)}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>

                    <div className="total-section mt-2">
                        <p>TOTAL FACTURA: <span className="total-amount">{formatCurrency(invoiceToPrint.totalFactura)}</span></p>
                    </div>

                    {invoiceToPrint.formaDePago && (
                        <p className="payment-method mt-1"><strong>Forma de Pago:</strong> <span className="capitalize">{invoiceToPrint.formaDePago}</span></p>
                    )}
                    {invoiceToPrint.observaciones && (
                        <div className="footer-notes mt-2 pt-1 border-t">
                        <p><strong>Observaciones:</strong> {invoiceToPrint.observaciones}</p>
                        </div>
                    )}
                </div>
                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cerrar</Button>
                    </DialogClose>
                    <Button onClick={printFacturaPreview}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir Factura
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </div>
  );
}
