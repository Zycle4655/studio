
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
import { Card, CardHeader, CardContent } from '@/components/ui/card'; // Import Card components for Skeleton

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
      if (user && db) { // Ensure db is initialized
        setIsFetchingProfile(true);
        const profileRef = doc(db, "companyProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setExistingProfile(profileSnap.data() as CompanyProfileFormData);
        }
        setIsFetchingProfile(false);
      } else if (!user && !authLoading) {
        setIsFetchingProfile(false);
      }
    }
    if (user) {
      fetchProfile();
    } else if (!authLoading) {
        setIsFetchingProfile(false);
    }
  }, [user, authLoading]);


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
        const currentProfileSnap = await getDoc(profileRef);
        if (currentProfileSnap.exists() && currentProfileSnap.data().createdAt) {
            createdAtTimestamp = currentProfileSnap.data().createdAt;
        }
      }

      const profileData: CompanyProfileDocument = {
        ...data,
        userId: user.uid,
        createdAt: createdAtTimestamp,
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, profileData, { merge: true }); 
      
      toast({
        title: "Perfil Guardado",
        description: `El perfil de ${data.companyName} ha sido ${existingProfile ? 'actualizado' : 'guardado'} con éxito.`,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el perfil." });
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
