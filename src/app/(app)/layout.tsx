"use client"; // This layout needs to be a client component for auth check

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedInZycle") === "true";
    if (!isLoggedIn) {
      router.replace("/login");
    } else {
      setIsVerified(true);
    }
  }, [router]);

  if (!isVerified) {
    // Optional: A more sophisticated loading state
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Verificando...</p>
        </div>
    ); 
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
