
"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Search, HandCoins, DollarSign, Scale, Banknote } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import type { PrestamoDocument, PrestamoFormData, Abono, AbonoFormData } from "@/schemas/prestamo";
import type { AsociadoDocument } from "@/schemas/sui";
import type { CollaboratorDocument } from "@/schemas/equipo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import PrestamoForm from "@/components/forms/PrestamoForm";
import AbonoForm from "@/components/forms/AbonoForm";


export default function PrestamosPage() {
  const { toast } = useToast();
  const { user, companyOwnerId, permissions, collaboratorId } = useAuth();
  const [prestamos, setPrestamos] = React.useState<PrestamoDocument[]>([]);
  const [asociados, setAsociados] = React.useState<AsociadoDocument[]>([]);
  const [colaboradores, setColaboradores] = React.useState<CollaboratorDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isPrestamoFormOpen, setIsPrestamoFormOpen] = React.useState(false);
  const [isAbonoFormOpen, setIsAbonoFormOpen] = React.useState(false);
  const [editingPrestamo, setEditingPrestamo] = React.useState<PrestamoDocument | null>(null);

  const [prestamoToDelete, setPrestamoToDelete] = React.useState<PrestamoDocument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  const [searchTerm, setSearchTerm] = React.useState("");

  const getPrestamosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "prestamos");
  }, [companyOwnerId]);
  
  const getAsociadosCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "asociados");
  }, [companyOwnerId]);

  const getColaboradoresCollectionRef = React.useCallback(() => {
    if (!companyOwnerId || !db) return null;
    return collection(db, "companyProfiles", companyOwnerId, "collaborators");
  }, [companyOwnerId]);


  const fetchData = React.useCallback(async () => {
    const prestamosCollectionRef = getPrestamosCollectionRef();
    const asociadosCollectionRef = getAsociadosCollectionRef();
    const colaboradoresCollectionRef = getColaboradoresCollectionRef();
    if (!prestamosCollectionRef || !asociadosCollectionRef || !colaboradoresCollectionRef) {
      if (companyOwnerId) {
          toast({ variant: "destructive", title: "Error", description: "La conexión a la base de datos no está lista." });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch Asociados
      const asocQuery = query(asociadosCollectionRef, orderBy("nombre", "asc"));
      const asocSnapshot = await getDocs(asocQuery);
      const asociadosList = asocSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AsociadoDocument));
      setAsociados(asociadosList);
      
      // Fetch Colaboradores
      const collabQuery = query(colaboradoresCollectionRef, orderBy("nombre", "asc"));
      const collabSnapshot = await getDocs(collabQuery);
      const colaboradoresList = collabSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollaboratorDocument));
      setColaboradores(colaboradoresList);

      // Fetch Prestamos
      const q = query(prestamosCollectionRef, orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const prestamosList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as PrestamoDocument)
      );
      setPrestamos(prestamosList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Datos",
        description: "No se pudieron cargar los préstamos, asociados o colaboradores.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyOwnerId, getPrestamosCollectionRef, getAsociadosCollectionRef, getColaboradoresCollectionRef, toast]);


  React.useEffect(() => {
    document.title = 'Talento Humano: Préstamos | ZYCLE';
    if (companyOwnerId) {
      fetchData();
    } else {
      setIsLoading(false);
      setAsociados([]);
      setPrestamos([]);
      setColaboradores([]);
    }
  }, [companyOwnerId, fetchData]);

  const handleOpenPrestamoForm = (prestamo?: PrestamoDocument) => {
    if (!user || !permissions?.equipo) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para esta acción." });
        return;
    }
    setEditingPrestamo(prestamo || null);
    setIsPrestamoFormOpen(true);
  };
  
  const handleOpenAbonoForm = (prestamo: PrestamoDocument) => {
     if (!user || prestamo.estado === 'Pagado' || !permissions?.equipo) return;
     setEditingPrestamo(prestamo);
     setIsAbonoFormOpen(true);
  };

  const openDeleteDialog = (prestamo: PrestamoDocument) => {
    if (!user || !permissions?.equipo) {
        toast({ variant: "destructive", title: "Acceso Denegado", description: "No tiene permiso para eliminar préstamos." });
        return;
    }
    setPrestamoToDelete(prestamo);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePrestamo = async () => {
    const prestamosCollectionRef = getPrestamosCollectionRef();
    if (!prestamoToDelete || !prestamosCollectionRef) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el préstamo." });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(prestamosCollectionRef, prestamoToDelete.id));
      toast({
        title: "Préstamo Eliminado",
        description: `El préstamo de "${prestamoToDelete.beneficiarioNombre}" ha sido eliminado.`,
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting loan:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: "No se pudo eliminar el préstamo.",
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setPrestamoToDelete(null);
    }
  };

  const handleSavePrestamo = async (data: PrestamoFormData) => {
    const prestamosCollectionRef = getPrestamosCollectionRef();
    if (!prestamosCollectionRef || !user) {
      toast({ variant: "destructive", title: "Error", description: "No se puede guardar. La conexión falló." });
      return;
    }
    setIsSubmitting(true);
    
    let beneficiarioNombre = "";
    if (data.tipoBeneficiario === 'asociado') {
        const asociado = asociados.find(a => a.id === data.beneficiarioId);
        beneficiarioNombre = asociado?.nombre || "";
    } else {
        const colaborador = colaboradores.find(c => c.id === data.beneficiarioId);
        beneficiarioNombre = colaborador?.nombre || "";
    }

    if (!beneficiarioNombre) {
       toast({ variant: "destructive", title: "Error", description: "Beneficiario no encontrado." });
       setIsSubmitting(false);
       return;
    }

    try {
      if (editingPrestamo) {
        // Edit logic
        const prestamoRef = doc(prestamosCollectionRef, editingPrestamo.id);
        const updatedData = {
            monto: data.monto,
            fecha: Timestamp.fromDate(data.fecha),
            tipoBeneficiario: data.tipoBeneficiario,
            beneficiarioId: data.beneficiarioId,
            beneficiarioNombre: beneficiarioNombre,
            observaciones: data.observaciones || null,
            updatedAt: serverTimestamp(),
            // Recalculate balance if amount changes
            saldoPendiente: data.monto - (editingPrestamo.monto - editingPrestamo.saldoPendiente)
        };
        await updateDoc(prestamoRef, updatedData);
        toast({ title: "Préstamo Actualizado", description: `El préstamo de "${beneficiarioNombre}" ha sido actualizado.` });
      } else {
        // Create logic
        const prestamoData: Omit<PrestamoDocument, 'id'> = {
          userId: user.uid,
          tipoBeneficiario: data.tipoBeneficiario,
          beneficiarioId: data.beneficiarioId,
          beneficiarioNombre: beneficiarioNombre,
          monto: data.monto,
          fecha: Timestamp.fromDate(data.fecha),
          estado: 'Pendiente',
          abonos: [],
          saldoPendiente: data.monto,
          observaciones: data.observaciones || null,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };
        await addDoc(prestamosCollectionRef, prestamoData);
        toast({ title: "Préstamo Registrado", description: `Se ha creado el préstamo para "${beneficiarioNombre}".` });
      }
      setIsPrestamoFormOpen(false);
      setEditingPrestamo(null);
      fetchData();
    } catch (error) {
      console.error("Error saving loan:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el préstamo." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveAbono = async (data: AbonoFormData) => {
    if (!editingPrestamo || !editingPrestamo.id) return;
    const prestamosCollectionRef = getPrestamosCollectionRef();
    if (!prestamosCollectionRef) return;
    
    setIsSubmitting(true);
    
    const nuevoSaldo = editingPrestamo.saldoPendiente - data.monto;
    if (nuevoSaldo < 0) {
      toast({ variant: "destructive", title: "Monto Inválido", description: "El abono no puede ser mayor que el saldo pendiente." });
      setIsSubmitting(false);
      return;
    }
    
    const nuevoAbono: Abono = {
      id: new Date().toISOString(),
      monto: data.monto,
      fecha: Timestamp.fromDate(data.fecha),
    };

    try {
      const prestamoRef = doc(prestamosCollectionRef, editingPrestamo.id);
      await updateDoc(prestamoRef, {
        abonos: arrayUnion(nuevoAbono),
        saldoPendiente: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'Pagado' : 'Pendiente',
        updatedAt: serverTimestamp(),
      });
      
      toast({ title: "Abono Registrado", description: `Se registró el abono al préstamo de ${editingPrestamo.beneficiarioNombre}.` });
      setIsAbonoFormOpen(false);
      setEditingPrestamo(null);
      fetchData();
      
    } catch(error) {
       console.error("Error saving payment:", error);
       toast({ variant: "destructive", title: "Error al Abonar", description: "No se pudo registrar el abono." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CO');
  };
  
  const userLoans = React.useMemo(() => {
    if (permissions?.equipo) {
      return prestamos; // Admin sees all loans
    }
    // Collaborator sees only their loans
    return prestamos.filter(p => p.tipoBeneficiario === 'colaborador' && p.beneficiarioId === collaboratorId);
  }, [prestamos, permissions, collaboratorId]);

  const filteredPrestamos = React.useMemo(() => {
    if (!searchTerm) {
      return userLoans;
    }
    return userLoans.filter(p => p.beneficiarioNombre.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [userLoans, searchTerm]);
  
  const summary = React.useMemo(() => {
    const totalPrestado = userLoans.reduce((sum, p) => sum + p.monto, 0);
    const saldoTotal = userLoans.reduce((sum, p) => sum + p.saldoPendiente, 0);
    return { totalPrestado, saldoTotal };
  }, [userLoans]);


  if (!user && !isLoading) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Card className="shadow-lg"><CardContent className="text-center py-12"><p>Debe iniciar sesión para ver esta página.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">

        {/* Header and Summary Cards */}
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary mb-2 font-headline flex items-center">
                <HandCoins className="mr-3 h-8 w-8"/>
                {permissions?.equipo ? "Gestión de Préstamos" : "Mis Préstamos"}
            </h1>
            <p className="text-lg text-muted-foreground">
                 {permissions?.equipo 
                    ? "Registre y controle los préstamos a sus asociados y empleados."
                    : "Consulte el estado y los abonos de sus préstamos."}
            </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {permissions?.equipo ? "Total Prestado" : "Monto Total de Mis Préstamos"}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4"/> : <div className="text-2xl font-bold">{formatCurrency(summary.totalPrestado)}</div>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {permissions?.equipo ? "Saldo Pendiente Total" : "Mi Saldo Pendiente"}
                    </CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-3/4"/> : <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.saldoTotal)}</div>}
                </CardContent>
            </Card>
        </div>


        {/* Main Content Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Historial de Préstamos</CardTitle>
              <CardDescription>
                  {permissions?.equipo 
                    ? "Consulte, edite y gestione todos los préstamos registrados."
                    : "Aquí puede ver el historial de sus préstamos y abonos."}
              </CardDescription>
            </div>
             {permissions?.equipo && (
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="space-y-2"> <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-32" /></div>
                  <div className="flex space-x-2"><Skeleton className="h-9 w-9 rounded-md" /><Skeleton className="h-9 w-9 rounded-md" /></div>
                </div>
              ))}
            </div>
          ) : userLoans.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <HandCoins className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay préstamos registrados</h3>
                <p className="text-muted-foreground mb-6">
                     {permissions?.equipo 
                        ? 'Utilice el botón "+" para registrar el primero.'
                        : "No tiene préstamos registrados en este momento."}
                </p>
            </div>
          ) : filteredPrestamos.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
                <p className="text-muted-foreground">Ningún préstamo coincide con "{searchTerm}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right w-[150px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPrestamos.map((prestamo) => (
                    <TableRow key={prestamo.id}>
                        <TableCell className="font-medium">{prestamo.beneficiarioNombre}</TableCell>
                        <TableCell>{formatDate(prestamo.fecha)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(prestamo.monto)}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">{formatCurrency(prestamo.saldoPendiente)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={prestamo.estado === 'Pagado' ? 'default' : 'secondary'} className={prestamo.estado === 'Pagado' ? 'bg-green-600' : 'bg-amber-500'}>
                                {prestamo.estado}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAbonoForm(prestamo)} disabled={isSubmitting || prestamo.estado === 'Pagado' || !permissions?.equipo}>
                            <Banknote className="h-4 w-4 mr-1"/> Abonar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPrestamoForm(prestamo)} disabled={isSubmitting || !permissions?.equipo}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteDialog(prestamo)} disabled={isSubmitting || !permissions?.equipo}><Trash2 className="h-4 w-4"/></Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {permissions?.equipo && (
        <Button
            className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-transform"
            size="icon"
            onClick={() => handleOpenPrestamoForm()}
            aria-label="Registrar nuevo préstamo"
            disabled={!user || isLoading || isSubmitting || (asociados.length === 0 && colaboradores.length === 0)}
        >
            <Plus className="h-8 w-8" />
        </Button>
      )}

      {isPrestamoFormOpen && (
          <PrestamoForm
            isOpen={isPrestamoFormOpen}
            setIsOpen={setIsPrestamoFormOpen}
            onSubmit={handleSavePrestamo}
            defaultValues={editingPrestamo || undefined}
            isLoading={isSubmitting}
            asociados={asociados}
            colaboradores={colaboradores}
            title={editingPrestamo ? "Editar Préstamo" : "Registrar Nuevo Préstamo"}
          />
      )}
      
      {isAbonoFormOpen && editingPrestamo && (
        <AbonoForm
            isOpen={isAbonoFormOpen}
            setIsOpen={setIsAbonoFormOpen}
            onSubmit={handleSaveAbono}
            prestamo={editingPrestamo}
            isLoading={isSubmitting}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El préstamo de "{prestamoToDelete?.beneficiarioNombre}" por un monto de {formatCurrency(prestamoToDelete?.monto || 0)} será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPrestamoToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrestamo}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
