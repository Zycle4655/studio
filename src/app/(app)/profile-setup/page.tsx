
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CompanyProfileForm from '@/components/forms/CompanyProfileForm';
import type { CompanyProfileFormData, CompanyProfileDocument } from '@/schemas/company';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [existingProfile, setExistingProfile] = useState<CompanyProfileFormData | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (user && db) {
        setIsFetchingProfile(true);
        try {
            const profileRef = doc(db, "companyProfiles", user.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                setExistingProfile(profileSnap.data() as CompanyProfileFormData);
            }
        } catch (error: any) {
            console.error("Error fetching company profile in ProfileSetupPage:", error);
            if (error.message && error.message.toLowerCase().includes("offline")) {
                console.warn("Firebase reported client is offline in ProfileSetupPage. Please check your internet connection and ensure Firestore is enabled and properly configured in your Firebase project console.");
                toast({ variant: "destructive", title: "Error de Conexión", description: "No se pudo conectar a la base de datos. Verifique su conexión y que Firestore esté habilitado."});
            } else {
                 toast({ variant: "destructive", title: "Error al Cargar Perfil", description: "No se pudo cargar el perfil existente."});
            }
        } finally {
            setIsFetchingProfile(false);
        }
      } else if (!user && !authLoading) {
        setIsFetchingProfile(false);
      } else if (!db && user && !authLoading) {
        console.warn("Firestore (db) is not initialized in ProfileSetupPage. Skipping profile fetch.");
        toast({ variant: "destructive", title: "Error de Configuración", description: "La base de datos no está disponible. Contacte al soporte."});
        setIsFetchingProfile(false);
      }
    }
    if (user) {
      fetchProfile();
    } else if (!authLoading) {
        setIsFetchingProfile(false);
    }
  }, [user, authLoading, toast]);


  const handleSubmit = async (data: CompanyProfileFormData) => {
    if (!user || !db) {
      toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado o base de datos no disponible." });
      return;
    }
    setIsLoading(true);
    try {
      const profileRef = doc(db, "companyProfiles", user.uid);
      
      let createdAtTimestamp = serverTimestamp();
      if (existingProfile) {
        // Check if existingProfile truly has a createdAt field before trying to use it.
        const currentProfileSnap = await getDoc(profileRef); // Re-fetch to be sure
        if (currentProfileSnap.exists()) {
            const currentData = currentProfileSnap.data() as CompanyProfileDocument;
            if (currentData.createdAt) {
                 createdAtTimestamp = currentData.createdAt;
            }
        }
      }

      const profileData: CompanyProfileDocument = {
        ...data,
        userId: user.uid,
        createdAt: createdAtTimestamp, // Uses fetched or new serverTimestamp
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, profileData, { merge: true }); 
      
      toast({
        title: "Perfil Guardado",
        description: `El perfil de ${data.companyName} ha sido ${existingProfile ? 'actualizado' : 'guardado'} con éxito.`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error saving profile:", error);
      if (error.message && error.message.toLowerCase().includes("offline")) {
        toast({ variant: "destructive", title: "Error de Conexión", description: "No se pudo guardar el perfil. Verifique su conexión e inténtelo de nuevo." });
      } else {
        toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudo guardar el perfil." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isFetchingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
         <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
                {[1,2,3,4].map(i => (
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
        defaultValues={existingProfile || undefined}
        isLoading={isLoading}
        title={existingProfile ? "Editar Perfil de Empresa" : "Completar Perfil de Empresa"}
        description={existingProfile ? "Actualice la información de su empresa." : "Por favor, complete los datos de su empresa para continuar."}
        submitButtonText={existingProfile ? "Actualizar Perfil" : "Guardar y Continuar"}
      />
    </div>
  );
}
