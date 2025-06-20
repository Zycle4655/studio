
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CompanyProfileForm from '@/components/forms/CompanyProfileForm';
import type { CompanyProfileFormData, CompanyProfileDocument } from '@/schemas/company';
import { auth, db } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateEmail } from 'firebase/auth'; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [defaultFormValues, setDefaultFormValues] = useState<CompanyProfileFormData | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchProfileAndSetDefaults() {
      if (user && db) {
        setIsFetchingProfile(true);
        let resolvedDefaultValues: CompanyProfileFormData;
        try {
            const profileRef = doc(db, "companyProfiles", user.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                const existingData = profileSnap.data() as CompanyProfileDocument;
                resolvedDefaultValues = {
                    email: user.email || "", // Ensure email is always a string
                    companyName: existingData.companyName || "",
                    nit: existingData.nit || "",
                    phone: existingData.phone || "",
                    address: existingData.address || "",
                };
                setIsEditing(true);
            } else {
                resolvedDefaultValues = { // For new profile
                    email: user.email || "",
                    companyName: "",
                    nit: "",
                    phone: "",
                    address: "",
                };
                setIsEditing(false);
            }
            setDefaultFormValues(resolvedDefaultValues);
        } catch (error: any) {
            console.error("Error fetching company profile in ProfileSetupPage:", error);
            if (error.message && error.message.toLowerCase().includes("offline")) {
                console.warn("Firebase reported client is offline in ProfileSetupPage. Please check your internet connection and ensure Firestore is enabled and properly configured in your Firebase project console.");
                toast({ variant: "destructive", title: "Error de Conexión", description: "No se pudo conectar a la base de datos. Verifique su conexión y que Firestore esté habilitado."});
            } else {
                 toast({ variant: "destructive", title: "Error al Cargar Perfil", description: "No se pudo cargar el perfil existente."});
            }
            // Ensure defaults are set even on error to prevent undefined state for form
            if (!resolvedDefaultValues!) {
                 resolvedDefaultValues = {
                    email: user.email || "", companyName: "", nit: "", phone: "", address: "",
                 };
                 setDefaultFormValues(resolvedDefaultValues);
            }
        } finally {
            setIsFetchingProfile(false);
        }
      } else if (!user && !authLoading) {
        setIsFetchingProfile(false);
         // Set empty defaults if no user and not loading to avoid undefined form values
         setDefaultFormValues({ email: "", companyName: "", nit: "", phone: "", address: "" });
      } else if (!db && user && !authLoading) {
        console.warn("Firestore (db) is not initialized in ProfileSetupPage. Skipping profile fetch.");
        toast({ variant: "destructive", title: "Error de Configuración", description: "La base de datos no está disponible. Contacte al soporte."});
        // Set empty defaults to avoid undefined form values
        setDefaultFormValues({ email: user.email || "", companyName: "", nit: "", phone: "", address: "" });
        setIsFetchingProfile(false);
      }
    }
    if (user) {
      fetchProfileAndSetDefaults();
    } else if (!authLoading) {
        setIsFetchingProfile(false);
        setDefaultFormValues({ email: "", companyName: "", nit: "", phone: "", address: "" });
    }
  }, [user, authLoading, toast]);


  const handleSubmit = async (data: CompanyProfileFormData) => {
    if (!user || !db || !auth) { 
      toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado, base de datos o autenticación no disponible." });
      return;
    }
    setIsLoading(true);

    let emailUpdatedSuccessfully = false;
    let emailUpdateAttempted = false;

    if (data.email && data.email !== user.email && isEditing) { // Only attempt update if editing and email changed
      emailUpdateAttempted = true;
      try {
        if (!auth.currentUser) {
            await auth.currentUser?.reload(); // Try to refresh current user
        }
        if (auth.currentUser) { // Check again after potential reload
             await updateEmail(auth.currentUser, data.email);
             emailUpdatedSuccessfully = true;
             toast({
               title: "Correo Actualizado",
               description: "Su dirección de correo electrónico ha sido actualizada.",
             });
        } else {
            throw new Error("Current user not available for email update.");
        }
      } catch (error: any) {
        console.error("Error updating email:", error);
        if (error.code === 'auth/requires-recent-login') {
          toast({
            variant: "destructive",
            title: "Actualización de Correo Requiere Reautenticación",
            description: "Para cambiar su correo, Firebase requiere que haya iniciado sesión recientemente. Por favor, cierre sesión y vuelva a iniciarla, luego intente de nuevo. Sus otros datos de perfil sí fueron guardados.",
          });
        } else if (error.code === 'auth/email-already-in-use') {
           toast({ variant: "destructive", title: "Error al Actualizar Correo", description: "El nuevo correo electrónico ya está en uso por otra cuenta." });
        } else {
          toast({ variant: "destructive", title: "Error al Actualizar Correo", description: `No se pudo actualizar el correo electrónico. (${error.message})` });
        }
      }
    }

    try {
      const profileRef = doc(db, "companyProfiles", user.uid);
      
      let createdAtTimestamp = serverTimestamp(); 
      if (isEditing) { 
        const currentProfileSnap = await getDoc(profileRef);
        if (currentProfileSnap.exists()) {
            const currentData = currentProfileSnap.data() as CompanyProfileDocument;
            if (currentData.createdAt) {
                 createdAtTimestamp = currentData.createdAt;
            }
        }
      }

      const companyProfileData: CompanyProfileDocument = {
        userId: user.uid,
        companyName: data.companyName,
        nit: data.nit,
        phone: data.phone,
        address: data.address,
        createdAt: createdAtTimestamp,
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, companyProfileData, { merge: true });
      
      if (!emailUpdateAttempted || emailUpdatedSuccessfully) {
         toast({
            title: "Perfil Guardado",
            description: `El perfil de ${data.companyName} ha sido ${isEditing ? 'actualizado' : 'guardado'} con éxito.`,
        });
      } else if (emailUpdateAttempted && !emailUpdatedSuccessfully) {
         toast({
            title: "Perfil de Empresa Guardado",
            description: `Los datos de la empresa ${data.companyName} han sido actualizados. El correo no pudo ser cambiado esta vez.`,
        });
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error saving company profile:", error);
      if (error.message && error.message.toLowerCase().includes("offline")) {
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se pudo guardar el perfil de la empresa. Verifique su conexión e inténtelo de nuevo." });
      } else {
        toast({ variant: "destructive", title: "Error al Guardar Perfil de Empresa", description: "No se pudo guardar el perfil de la empresa." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isFetchingProfile || defaultFormValues === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
         <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
                {[1,2,3,4,5].map(i => ( 
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
                <Skeleton className="h-10 w-full" />
            </CardContent>
         </Card>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <CompanyProfileForm
        onSubmit={handleSubmit}
        defaultValues={defaultFormValues} // This will be CompanyProfileFormData or undefined initially
        isLoading={isLoading}
        title={isEditing ? "Editar Perfil" : "Completar Perfil de Empresa"}
        description={isEditing ? "Actualice la información de su empresa y cuenta." : "Por favor, complete los datos de su empresa para continuar."}
        submitButtonText={isEditing ? "Actualizar Perfil" : "Guardar y Continuar"}
        isEditing={isEditing} 
      />
    </div>
  );
}

