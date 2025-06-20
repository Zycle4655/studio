
"use client"; 

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar"; 
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"; 
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore"; 
import type { CompanyProfileDocument } from "@/schemas/company";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false); 
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [companyNameToDisplay, setCompanyNameToDisplay] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      setIsInitialLoading(false); 
      setCompanyNameToDisplay(null);
      setCompanyLogoUrl(null); 
      return;
    }

    if (!authLoading && user && !profileChecked) {
      const checkProfile = async () => {
        if (!db) { 
            console.warn("Firestore (db) is not initialized in AppLayout. Skipping profile check.");
            setProfileChecked(true);
            setIsInitialLoading(false);
            setCompanyNameToDisplay(null);
            setCompanyLogoUrl(null);
            return;
        }
        try {
          const profileRef = doc(db, "companyProfiles", user.uid);
          const profileSnap = await getDoc(profileRef);
          if (!profileSnap.exists()) {
            router.replace("/profile-setup");
            setCompanyNameToDisplay(null);
            setCompanyLogoUrl(null);
          } else {
            const companyData = profileSnap.data() as CompanyProfileDocument;
            setCompanyNameToDisplay(companyData.companyName);
            setCompanyLogoUrl(companyData.logoUrl || null);
          }
        } catch (error: any) {
          console.error("Error checking company profile in AppLayout:", error);
          setCompanyNameToDisplay(null);
          setCompanyLogoUrl(null);
          if (error.message && error.message.toLowerCase().includes("offline")) {
            console.warn("Firebase reported client is offline in AppLayout. Please check your internet connection and ensure Firestore is enabled and properly configured in your Firebase project console.");
          }
        } finally {
          setProfileChecked(true);
          setIsInitialLoading(false); 
        }
      };
      checkProfile();
    } else if (authLoading) {
        setIsInitialLoading(true); 
    } else if (profileChecked && !authLoading && user) {
        setIsInitialLoading(false);
    } else if (!authLoading && !user) {
        setIsInitialLoading(false);
        setCompanyNameToDisplay(null);
        setCompanyLogoUrl(null);
    }

  }, [user, authLoading, router, profileChecked]);

  if (isInitialLoading) { 
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <Skeleton className="h-8 w-24" /> 
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="flex-1 container py-8 px-4 md:px-6">
          <div className="mb-8">
            <Skeleton className="h-10 w-1/2 mb-2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    ); 
  }

  if (!user) {
    return null; 
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader companyName={companyNameToDisplay} companyLogoUrl={companyLogoUrl} />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
