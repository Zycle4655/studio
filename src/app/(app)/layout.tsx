
"use client"; 

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore"; 

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false); 
  const [isInitialLoading, setIsInitialLoading] = useState(true); 

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      setIsInitialLoading(false); 
      return;
    }

    if (!authLoading && user && !profileChecked) {
      const checkProfile = async () => {
        if (!db) { // Ensure db is initialized
            console.warn("Firestore (db) is not initialized. Skipping profile check.");
            setProfileChecked(true);
            setIsInitialLoading(false);
            return;
        }
        try {
          const profileRef = doc(db, "companyProfiles", user.uid);
          const profileSnap = await getDoc(profileRef);
          if (!profileSnap.exists()) {
            router.replace("/profile-setup");
          }
        } catch (error) {
          console.error("Error checking company profile:", error);
        } finally {
          setProfileChecked(true);
          setIsInitialLoading(false); 
        }
      };
      checkProfile();
    } else if (authLoading) {
        setIsInitialLoading(true); 
    } else if (profileChecked && !authLoading && user) {
        // If auth is done, user exists, and profile is checked, then loading is done.
        setIsInitialLoading(false);
    } else if (!authLoading && !user) {
        // If auth is done and no user, loading is also done (handled by first if).
        setIsInitialLoading(false);
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
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
