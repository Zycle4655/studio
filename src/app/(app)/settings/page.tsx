
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { CompanyProfileDocument } from '@/schemas/company'; // Usar CompanyProfileDocument
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Hash, Phone, MapPin, Edit, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfileDocument | null>(null); // Tipo actualizado
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (user && db) { 
        setIsLoadingProfile(true);
        try {
          const profileRef = doc(db, "companyProfiles", user.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as CompanyProfileDocument);
          }
        } catch (error) {
            console.error("Error fetching profile in SettingsPage:", error);
             // Podrías añadir un toast aquí si lo deseas
        } finally {
            setIsLoadingProfile(false);
        }
      } else if (!user && !authLoading) {
        setIsLoadingProfile(false);
      }
    }
    if (user) {
      fetchProfile();
    } else if (!authLoading) {
        setIsLoadingProfile(false);
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingProfile) {
    return (
        <div className="container py-8 px-4 md:px-6">
            <Skeleton className="h-10 w-1/3 mb-2" />
            <Skeleton className="h-6 w-2/3 mb-8" />
            <Card className="w-full max-w-2xl mx-auto shadow-lg">
                <CardHeader>
                     <Skeleton className="h-8 w-1/2 mb-1" />
                     <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1,2,3,4,5].map(i => ( // 5 items para incluir el email
                         <div key={i} className="flex items-start space-x-3">
                            <Skeleton className="h-6 w-6 rounded-full mt-1" />
                            <div className='flex-1 space-y-1'>
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-5 w-1/2" />
                            </div>
                         </div>
                    ))}
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (!user) return null; 

  return (
    <div className="container py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-2 font-headline">Configuración de la Cuenta</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Aquí puede ver y editar la información de su empresa y cuenta.
      </p>

      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Perfil de la Empresa y Cuenta</CardTitle>
          <CardDescription>Información registrada de su empresa y datos de su cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                    <span className="font-medium text-foreground/80 block">Nombre de la Empresa:</span>
                    <span className="text-foreground">{profile.companyName}</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Hash className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                 <div>
                    <span className="font-medium text-foreground/80 block">NIT:</span>
                    <span className="text-foreground">{profile.nit}</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                    <span className="font-medium text-foreground/80 block">Teléfono:</span>
                    <span className="text-foreground">{profile.phone}</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                    <span className="font-medium text-foreground/80 block">Dirección:</span>
                    <span className="text-foreground">{profile.address}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              No se ha completado el perfil de la empresa.
            </p>
          )}
          {/* Separador visual si hay perfil Y hay email */}
          {profile && user.email && <div className="pt-4 border-t border-border"></div>}
          
          {user.email && (
            <div className={`flex items-start space-x-3 ${profile ? '' : 'pt-4 border-t border-border'}`}>
                <Mail className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                    <span className="font-medium text-foreground/80 block">Correo Electrónico de la Cuenta:</span>
                    <span className="text-foreground">{user.email}</span>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/profile-setup">
              <Edit className="mr-2 h-4 w-4" />
              {profile ? "Editar Perfil y Cuenta" : "Completar Perfil de Empresa"}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
