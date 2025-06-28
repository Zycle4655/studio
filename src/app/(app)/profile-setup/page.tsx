
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CompanyProfileForm from '@/components/forms/CompanyProfileForm';
import type { CompanyProfileFormData, CompanyProfileDocument } from '@/schemas/company';
import { auth, db, storage } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { updateEmail } from 'firebase/auth'; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Helper function to extract storage path from a Firebase download URL
function getPathFromStorageUrl(url: string): string | null {
  try {
    const urlObject = new URL(url);
    const pathName = urlObject.pathname;
    
    // Path looks like: /v0/b/your-bucket.appspot.com/o/path%2Fto%2Ffile.jpg
    const objectPathStartIndex = pathName.indexOf('/o/');
    if (objectPathStartIndex === -1) {
      console.warn("Could not find object path marker '/o/' in URL pathname.");
      return null;
    }
    
    // The encoded path starts after '/o/'
    const encodedPath = pathName.substring(objectPathStartIndex + 3);
    return decodeURIComponent(encodedPath);

  } catch(e) {
    console.error("Could not parse storage URL to get path:", e);
    return null;
  }
}

async function uploadLogo(userId: string, file: File): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  // Normalizar el nombre del archivo para evitar problemas, ej. usar una extensión fija o la del archivo.
  const fileExtension = file.name.split('.').pop() || 'png';
  const fileName = `logo.${fileExtension}`;
  const logoPath = `companyLogos/${userId}/${fileName}`;
  const logoStorageRef = storageRef(storage, logoPath);

  // Subir el archivo
  await uploadBytes(logoStorageRef, file);

  // Obtener la URL de descarga
  const downloadURL = await getDownloadURL(logoStorageRef);
  return downloadURL;
}

async function deleteLogo(currentLogoUrl: string | null | undefined): Promise<void> {
  if (!storage || !currentLogoUrl) {
    return; // No storage or no URL to delete.
  }
  
  const filePath = getPathFromStorageUrl(currentLogoUrl);
  
  if (!filePath) {
    console.warn("Could not extract file path from URL, skipping deletion of old logo:", currentLogoUrl);
    return;
  }

  try {
    const logoStorageRef = storageRef(storage, filePath);
    await deleteObject(logoStorageRef);
    console.log("Previous logo deleted successfully from path:", filePath);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn("Previous logo file not found in Storage, skipping deletion:", error.message);
    } else {
      // Log other errors but don't block the profile update process
      console.error("Error deleting previous logo from Storage:", error);
    }
  }
}


export default function ProfileSetupPage() {
  const { user, companyProfile, loading: authLoading, refreshCompanyProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [defaultFormValues, setDefaultFormValues] = useState<CompanyProfileFormData | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [existingCreatedAt, setExistingCreatedAt] = useState<Timestamp | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);


  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // We get the profile from the AuthContext now, which is more reliable.
    if (!authLoading && user) {
        let resolvedDefaultValues: CompanyProfileFormData;
        if (companyProfile) {
            const existingData = companyProfile;
            resolvedDefaultValues = {
                email: companyProfile.email || user.email || "",
                companyName: existingData.companyName || "",
                nit: existingData.nit || "",
                phone: existingData.phone || "",
                address: existingData.address || "",
                logoUrl: existingData.logoUrl || null,
            };
            setExistingCreatedAt(existingData.createdAt || null);
            setExistingLogoUrl(existingData.logoUrl || null);
            setIsEditing(true);
        } else {
            resolvedDefaultValues = { 
                email: user.email || "",
                companyName: "",
                nit: "",
                phone: "",
                address: "",
                logoUrl: null,
            };
            setIsEditing(false);
            setExistingCreatedAt(null);
            setExistingLogoUrl(null);
        }
        setDefaultFormValues(resolvedDefaultValues);
        setIsFetchingProfile(false);
    } else if (!authLoading && !user) {
        setIsFetchingProfile(false);
    }
  }, [user, authLoading, companyProfile]);


  const handleSubmit = async (data: CompanyProfileFormData, logoFile?: File | null) => {
    if (!user || !db || !auth) { 
      toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado, base de datos o autenticación no disponible." });
      return;
    }
    setIsLoading(true);

    let emailUpdatedSuccessfully = false;
    let emailUpdateAttempted = false;

    if (data.email && data.email !== user.email && isEditing) { 
      emailUpdateAttempted = true;
      try {
        if (!auth.currentUser) {
            await auth.currentUser?.reload(); 
        }
        if (auth.currentUser) { 
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
    
    let finalLogoUrl = existingLogoUrl;

    if (logoFile) { // Si se subió un nuevo archivo
      try {
        if (existingLogoUrl) {
            await deleteLogo(existingLogoUrl);
        }
        finalLogoUrl = await uploadLogo(user.uid, logoFile);
        toast({ title: "Logo Subido", description: "El nuevo logo se ha subido con éxito." });
      } catch (error) {
        console.error("Error uploading logo:", error);
        toast({ variant: "destructive", title: "Error al Subir Logo", description: "No se pudo subir el nuevo logo." });
        setIsLoading(false);
        return;
      }
    } else if (data.logoUrl === null && existingLogoUrl !== null) { 
      await deleteLogo(existingLogoUrl);
      finalLogoUrl = null;
      toast({ title: "Logo Eliminado", description: "El logo ha sido eliminado." });
    }

    try {
      const profileRef = doc(db, "companyProfiles", user.uid);
      
      const companyProfileData: CompanyProfileDocument = {
        userId: user.uid,
        email: data.email,
        companyName: data.companyName,
        nit: data.nit,
        phone: data.phone,
        address: data.address,
        logoUrl: finalLogoUrl,
        createdAt: existingCreatedAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, companyProfileData, { merge: true });
      
      await refreshCompanyProfile();
      
      if (!emailUpdateAttempted || emailUpdatedSuccessfully) {
         toast({
            title: "Éxito",
            description: "Datos de la empresa guardados.",
        });
      } else if (emailUpdateAttempted && !emailUpdatedSuccessfully) {
         toast({
            title: "Perfil de Empresa Guardado",
            description: "Los datos de la empresa se actualizaron, pero el correo no pudo ser cambiado.",
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
                <div className="flex items-center gap-4">
                    <Skeleton className="w-20 h-20 rounded-md border" />
                    <Skeleton className="h-10 w-32" />
                </div>
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
        defaultValues={defaultFormValues} 
        isLoading={isLoading}
        title={isEditing ? "Editar Perfil" : "Completar Perfil de Empresa"}
        description={isEditing ? "Actualice la información de su empresa y cuenta." : "Por favor, complete los datos de su empresa para continuar."}
        submitButtonText={isEditing ? "Actualizar Perfil" : "Guardar y Continuar"}
        isEditing={isEditing} 
      />
    </div>
  );
}
