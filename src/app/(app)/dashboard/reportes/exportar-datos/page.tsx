
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { Download, HardHat, Users, Building, Package, ShoppingCart, Store, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Types for documents - ideally imported from schemas
import type { CollaboratorDocument } from "@/schemas/equipo";
import type { AsociadoDocument } from "@/schemas/sui";
import type { FuenteDocument } from "@/schemas/fuente";
import type { MaterialDocument } from "@/schemas/material";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { FacturaVentaDocument } from "@/schemas/venta";

type ExportType = 'colaboradores' | 'asociados' | 'fuentes' | 'materiales' | 'compras' | 'ventas';

export default function ExportarDatosPage() {
    const { companyOwnerId } = useAuth();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = React.useState<ExportType | null>(null);
    
    React.useEffect(() => {
      document.title = 'Exportar Datos | ZYCLE';
    }, []);

    const handleExport = async (type: ExportType) => {
        if (!companyOwnerId) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo identificar la empresa." });
            return;
        }
        setIsExporting(type);
        try {
            switch (type) {
                case 'colaboradores':
                    await exportCollaborators();
                    break;
                case 'asociados':
                    await exportAsociados();
                    break;
                case 'fuentes':
                    await exportFuentes();
                    break;
                case 'materiales':
                    await exportMateriales();
                    break;
                case 'compras':
                    await exportFacturasCompra();
                    break;
                case 'ventas':
                    await exportFacturasVenta();
                    break;
            }
            toast({ title: "Exportación Exitosa", description: `El reporte de ${type} ha sido descargado.` });
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            toast({ variant: "destructive", title: "Error de Exportación", description: `No se pudo generar el reporte de ${type}.` });
        } finally {
            setIsExporting(null);
        }
    };

    const formatDateForExport = (timestamp: Timestamp | Date | undefined | null) => {
        if (!timestamp) return "";
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        return format(date, "yyyy-MM-dd HH:mm:ss", { locale: es });
    };

    const downloadAsExcel = (data: any[], fileName: string) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportCollaborators = async () => {
        const collabsRef = collection(db, "companyProfiles", companyOwnerId!, "collaborators");
        const snapshot = await getDocs(query(collabsRef, orderBy("nombre")));
        const data = snapshot.docs.map(doc => {
            const d = doc.data() as CollaboratorDocument;
            return {
                "Nombre Completo": d.nombre,
                "Email": d.email,
                "Cargo": d.rol,
                "Tipo ID": d.tipoIdentificacion,
                "Numero ID": d.numeroIdentificacion,
                "Fecha Nacimiento": d.fechaNacimiento ? formatDateForExport(d.fechaNacimiento) : "",
                "Telefono": d.telefono,
                "Direccion": d.direccion,
                "EPS": d.eps,
                "AFP": d.afp,
                "ARL": d.arl,
                "Contacto Emergencia Nombre": d.contactoEmergenciaNombre,
                "Contacto Emergencia Telefono": d.contactoEmergenciaTelefono,
            };
        });
        downloadAsExcel(data, "Reporte_Colaboradores");
    };

    const exportAsociados = async () => {
        const asociadosRef = collection(db, "companyProfiles", companyOwnerId!, "asociados");
        const snapshot = await getDocs(query(asociadosRef, orderBy("nombre")));
        const data = snapshot.docs.map(doc => {
            const d = doc.data() as AsociadoDocument;
            return {
                "Nombre": d.nombre,
                "Tipo ID": d.tipoIdentificacion,
                "Numero ID": d.numeroIdentificacion,
                "Telefono": d.telefono,
                "Direccion": d.direccion,
                "Placa Vehiculo": d.placaVehiculo,
                "NUMACRO": d.numacro,
                "NUECA": d.nueca,
            };
        });
        downloadAsExcel(data, "Reporte_Asociados");
    };
    
    const exportFuentes = async () => {
        const fuentesRef = collection(db, "companyProfiles", companyOwnerId!, "fuentes");
        const snapshot = await getDocs(query(fuentesRef, orderBy("nombre")));
        const data = snapshot.docs.map(doc => {
            const d = doc.data() as FuenteDocument;
            return {
                "Nombre Fuente": d.nombre,
                "Direccion": d.direccion,
                "Tipo": d.tipo,
                "Nombre Encargado": d.encargadoNombre,
                "Telefono Encargado": d.encargadoTelefono,
                "Email Encargado": d.encargadoEmail,
            };
        });
        downloadAsExcel(data, "Reporte_Fuentes");
    };

    const exportMateriales = async () => {
        const materialsRef = collection(db, "companyProfiles", companyOwnerId!, "materials");
        const snapshot = await getDocs(query(materialsRef, orderBy("name")));
        const data = snapshot.docs.map(doc => {
            const d = doc.data() as MaterialDocument;
            return {
                "Nombre Material": d.name,
                "Codigo": d.code,
                "Precio Base (COP)": d.price,
                "Stock Actual (kg)": d.stock || 0,
            };
        });
        downloadAsExcel(data, "Reporte_Inventario");
    };
    
    const exportFacturasCompra = async () => {
        const invoicesRef = collection(db, "companyProfiles", companyOwnerId!, "purchaseInvoices");
        const snapshot = await getDocs(query(invoicesRef, orderBy("numeroFactura")));
        const flattenedData: any[] = [];
        snapshot.docs.forEach(doc => {
            const d = doc.data() as FacturaCompraDocument;
            d.items.forEach(item => {
                flattenedData.push({
                    "N Factura": d.numeroFactura,
                    "Fecha": formatDateForExport(d.fecha),
                    "Proveedor": d.proveedorNombre || "N/A",
                    "Tipo Proveedor": d.tipoProveedor,
                    "Material": item.materialName,
                    "Codigo Material": item.materialCode,
                    "Peso (kg)": item.peso,
                    "Precio Unitario (COP)": item.precioUnitario,
                    "Subtotal (COP)": item.subtotal,
                    "Forma de Pago": d.formaDePago,
                    "Abono Prestamo": d.abonoPrestamo,
                    "Neto Pagado": d.netoPagado,
                    "Observaciones": d.observaciones,
                });
            });
        });
        downloadAsExcel(flattenedData, "Reporte_Facturas_Compra");
    };

    const exportFacturasVenta = async () => {
        const invoicesRef = collection(db, "companyProfiles", companyOwnerId!, "saleInvoices");
        const snapshot = await getDocs(query(invoicesRef, orderBy("numeroFactura")));
        const flattenedData: any[] = [];
        snapshot.docs.forEach(doc => {
            const d = doc.data() as FacturaVentaDocument;
            d.items.forEach(item => {
                flattenedData.push({
                    "N Factura": d.numeroFactura,
                    "Fecha": formatDateForExport(d.fecha),
                    "Cliente": d.clienteNombre || "N/A",
                    "Material": item.materialName,
                    "Codigo Material": item.materialCode,
                    "Peso (kg)": item.peso,
                    "Precio Unitario (COP)": item.precioUnitario,
                    "Subtotal (COP)": item.subtotal,
                    "Forma de Pago": d.formaDePago,
                    "Observaciones": d.observaciones,
                });
            });
        });
        downloadAsExcel(flattenedData, "Reporte_Facturas_Venta");
    };
    
    const reportOptions = [
        { type: 'colaboradores' as ExportType, title: "Colaboradores", description: "Exporta la lista completa de colaboradores con sus datos personales y laborales.", icon: <HardHat /> },
        { type: 'asociados' as ExportType, title: "Asociados (Recicladores)", description: "Exporta todos los asociados registrados, útil para reportes SUI.", icon: <Users /> },
        { type: 'fuentes' as ExportType, title: "Fuentes de Recolección", description: "Exporta la lista de todas las fuentes (empresas, conjuntos) con sus datos de contacto.", icon: <Building /> },
        { type: 'materiales' as ExportType, title: "Inventario de Materiales", description: "Exporta la lista de materiales con su precio base y stock actual en bodega.", icon: <Package /> },
        { type: 'compras' as ExportType, title: "Detalle de Compras", description: "Exporta un reporte detallado de todas las facturas de compra, ítem por ítem.", icon: <ShoppingCart /> },
        { type: 'ventas' as ExportType, title: "Detalle de Ventas", description: "Exporta un reporte detallado de todas las facturas de venta, ítem por ítem.", icon: <Store /> },
    ];


    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary flex items-center">
                        <FileSpreadsheet className="mr-3 h-7 w-7" />
                        Generador de Reportes
                    </CardTitle>
                    <CardDescription>
                        Seleccione el tipo de datos que desea exportar. Se generará un archivo Excel (.xlsx).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reportOptions.map(opt => (
                            <Card key={opt.type}>
                                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                                      {React.cloneElement(opt.icon, { className: 'h-6 w-6' })}
                                    </div>
                                    <CardTitle className="text-lg">{opt.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                                    <Button 
                                        className="w-full"
                                        onClick={() => handleExport(opt.type)} 
                                        disabled={isExporting !== null}
                                    >
                                        {isExporting === opt.type ? 'Exportando...' : <><Download className="mr-2 h-4 w-4" />Descargar</>}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
