
"use client";

import type { Metadata } from 'next';
import * as React from "react";
import { Printer, Edit, ShoppingBag, PackageSearch } from "lucide-react";
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
import type { FacturaCompraDocument } from "@/schemas/compra";
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

export default function FacturasCompraPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter(); 
  const [invoices, setInvoices] = React.useState<FacturaCompraDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfileDocument | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  const [invoiceToPrint, setInvoiceToPrint] = React.useState<FacturaCompraDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);

  const getPurchaseInvoicesCollectionRef = React.useCallback(() => {
    if (!user || !db) return null;
    return collection(db, "companyProfiles", user.uid, "purchaseInvoices");
  }, [user]);

  const getCompanyProfileRef = React.useCallback(() => {
    if (!user || !db) return null;
    return doc(db, "companyProfiles", user.uid);
  }, [user]);


  const fetchInvoicesAndProfile = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesRef = getPurchaseInvoicesCollectionRef();
      if (invoicesRef) {
        const q = query(invoicesRef, orderBy("numeroFactura", "desc"));
        const querySnapshot = await getDocs(q);
        const invoicesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacturaCompraDocument));
        setInvoices(invoicesList);
      }

      const profileRef = getCompanyProfileRef();
      if (profileRef) {
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        }
      }
      setUserEmail(user.email);

    } catch (error) {
      console.error("Error fetching invoices or profile:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las facturas o el perfil." });
    } finally {
      setIsLoading(false);
    }
  }, [user, getPurchaseInvoicesCollectionRef, getCompanyProfileRef, toast]);

  React.useEffect(() => {
    document.title = 'Facturas de Compra | ZYCLE';
    if (user) {
      fetchInvoicesAndProfile();
    } else {
      setInvoices([]);
      setCompanyProfile(null);
      setUserEmail(null);
      setIsLoading(false);
    }
  }, [user, fetchInvoicesAndProfile]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (timestamp: Timestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return format(date, "PPP", { locale: es });
  };

  const handleOpenPrintModal = (invoice: FacturaCompraDocument) => {
    setInvoiceToPrint(invoice);
    setIsPrintModalOpen(true);
  };
  
  const handleEditInvoice = (invoiceId: string | undefined) => {
    if(!invoiceId) return;
    router.push(`/dashboard/gestion-material/facturas-compra/${invoiceId}/edit`);
  };

  const printFacturaPreview = () => {
    const previewElement = document.getElementById("factura-print-content-modal");
    if (previewElement && invoiceToPrint) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups."})
        return;
      }
      printWindow.document.write('<html><head><title>Factura de Compra N° '+ invoiceToPrint.numeroFactura +'</title>');
      
      const stylesHtml = `
        <style>
          body { font-family: sans-serif; margin: 20px; color: #333; }
          .invoice-header { text-align: center; margin-bottom: 20px; }
          .invoice-header img { max-height: 60px; margin-bottom: 10px; object-fit: contain; }
          .invoice-header h1 { margin: 0; font-size: 1.6em; color: #005A9C; }
          .invoice-header p { margin: 2px 0; font-size: 0.9em; }
          .company-details, .invoice-details, .provider-details { margin-bottom: 15px; font-size: 0.9em;}
          .company-details p, .invoice-details p, .provider-details p { margin: 3px 0; }
          .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #005A9C; font-size: 1em; text-transform: uppercase; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; font-weight: bold; }
          .text-right { text-align: right !important; }
          .total-section { margin-top: 20px; text-align: right; font-size: 1em; }
          .total-section p { margin: 5px 0; font-weight: bold; }
          .total-section .total-amount { color: #005A9C; font-size: 1.2em;}
          .footer-notes { margin-top: 30px; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 10px; }
          .signature-area { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; }
          .signature-block { width: 45%; text-align: center;}
          .signature-line { display: inline-block; width: 200px; border-bottom: 1px solid #333; margin-top: 40px; }
          .grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .items-table th, .items-table td { font-size: 0.85em; padding: 6px;}
            .invoice-header h1 { font-size: 1.5em; }
            .section-title { font-size: 0.95em; }
          }
        </style>
      `;
      printWindow.document.write(stylesHtml);
      printWindow.document.write('</head><body>');
      printWindow.document.write(previewElement.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
         printWindow.print();
      }, 250);
    } else {
        toast({variant: "destructive", title:"Error de Impresión", description: "No se pudo generar la vista previa. Datos de factura o perfil incompletos."})
    }
  };


  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">Facturas de Compra</CardTitle>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <ShoppingBag className="mr-3 h-7 w-7" />
                Historial de Facturas de Compra
                </CardTitle>
                <CardDescription>
                Consulte, imprima o gestione sus facturas de compra de materiales.
                </CardDescription>
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
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay facturas de compra registradas</h3>
              <p className="text-muted-foreground">Cuando registre una compra, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">N° Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Total (COP)</TableHead>
                    <TableHead className="text-center w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.numeroFactura}</TableCell>
                      <TableCell>{formatDate(invoice.fecha)}</TableCell>
                      <TableCell>{invoice.proveedorNombre || "N/A"}</TableCell>
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

      {/* Modal para Imprimir Factura */}
      {invoiceToPrint && companyProfile && (
         <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Printer className="mr-2 h-6 w-6 text-primary"/>
                        Imprimir Factura N° {invoiceToPrint.numeroFactura}
                    </DialogTitle>
                    <DialogDescription>
                        Revise la factura antes de imprimir.
                    </DialogDescription>
                </DialogHeader>
                <div id="factura-print-content-modal" className="p-1 border rounded-md bg-card/50 text-sm max-h-[70vh] overflow-y-auto my-4">
                    <div className="invoice-header">
                        {companyProfile.logoUrl && (
                            <Image 
                                src={companyProfile.logoUrl} 
                                alt={`Logo de ${companyProfile.companyName}`} 
                                width={80} 
                                height={60} 
                                className="mx-auto mb-2 object-contain"
                                data-ai-hint="logo company"
                            />
                        )}
                        <h1 className="text-xl font-bold text-primary">{companyProfile.companyName}</h1>
                        {companyProfile.nit && <p>NIT: {companyProfile.nit}</p>}
                        {companyProfile.address && <p>{companyProfile.address}</p>}
                        {companyProfile.phone && <p>Tel: {companyProfile.phone}</p>}
                        {userEmail && <p>Email: {userEmail}</p>}
                    </div>
                    
                    <div className="section-title mt-4">Información de la Factura</div>
                    <div className="invoice-details grid-2-cols my-2">
                        <div>
                        <p><strong>Factura de Compra N°:</strong> <span className="text-primary font-semibold">{invoiceToPrint.numeroFactura}</span></p>
                        </div>
                        <div className="text-right">
                        <p><strong>Fecha:</strong> {formatDate(invoiceToPrint.fecha)}</p>
                        </div>
                    </div>
                    
                    {invoiceToPrint.proveedorNombre && (
                        <>
                        <div className="section-title">Información del Proveedor</div>
                        <div className="provider-details my-2">
                            {invoiceToPrint.proveedorNombre && <p><strong>Nombre:</strong> {invoiceToPrint.proveedorNombre}</p>}
                            {/* {invoiceToPrint.proveedorIdentificacion && <p><strong>Identificación:</strong> {invoiceToPrint.proveedorIdentificacion}</p>} */}
                        </div>
                        </>
                    )}

                    <div className="section-title">Detalle de la Compra</div>
                    <div className="overflow-x-auto">
                        <table className="items-table w-full text-xs">
                        <thead>
                            <tr>
                            <th className="py-1 px-2">Material</th>
                            <th className="py-1 px-2">Código</th>
                            <th className="py-1 px-2 text-right">Peso (kg)</th>
                            <th className="py-1 px-2 text-right">Vr. Unit.</th>
                            <th className="py-1 px-2 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceToPrint.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                                <td className="py-1 px-2">{item.materialName}</td>
                                <td className="py-1 px-2">{item.materialCode || "N/A"}</td>
                                <td className="py-1 px-2 text-right">{item.peso.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-1 px-2 text-right">{formatCurrency(item.precioUnitario)}</td>
                                <td className="py-1 px-2 text-right">{formatCurrency(item.subtotal)}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>

                    <div className="total-section mt-4">
                        <p>TOTAL FACTURA: <span className="total-amount">{formatCurrency(invoiceToPrint.totalFactura)}</span></p>
                    </div>

                    {invoiceToPrint.formaDePago && (
                        <p className="mt-2 text-xs"><strong>Forma de Pago:</strong> <span className="capitalize">{invoiceToPrint.formaDePago}</span></p>
                    )}
                    {invoiceToPrint.observaciones && (
                        <div className="footer-notes mt-3 pt-2 border-t">
                        <p className="text-xs"><strong>Observaciones:</strong> {invoiceToPrint.observaciones}</p>
                        </div>
                    )}
                    <div className="signature-area">
                        <div className="signature-block">
                            <p>Firma Proveedor:</p>
                            <div className="signature-line"></div>
                        </div>
                        <div className="signature-block">
                            <p>Firma Recibido (Empresa):</p>
                            <div className="signature-line"></div>
                        </div>
                    </div>
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
