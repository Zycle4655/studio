
"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { CompanyProfileDocument } from "@/schemas/company";
import type { DefaultRole } from "@/schemas/equipo";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyProfile: CompanyProfileDocument | null;
  refreshCompanyProfile: () => Promise<void>;
  role: DefaultRole;
  setRole: (role: DefaultRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileDocument | null>(null);
  const [role, setRole] = useState<DefaultRole>('admin'); // Default role is admin

  const fetchCompanyProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser && db) {
      try {
        const profileRef = doc(db, "companyProfiles", currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCompanyProfile(profileSnap.data() as CompanyProfileDocument);
        } else {
          setCompanyProfile(null);
        }
      } catch (error) {
        console.error("Error fetching company profile in AuthContext:", error);
        setCompanyProfile(null);
      }
    } else {
      setCompanyProfile(null);
    }
  }, []);

  const refreshCompanyProfile = useCallback(async () => {
    if(user) {
        await fetchCompanyProfile(user);
    }
  }, [user, fetchCompanyProfile]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      await fetchCompanyProfile(currentUser);
      // For now, the logged in user is always admin. This can be expanded later.
      // This role is for UI simulation purposes.
      setRole('admin'); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchCompanyProfile]);

  const value = useMemo(() => ({
    user,
    loading,
    companyProfile,
    refreshCompanyProfile,
    role,
    setRole,
  }), [user, loading, companyProfile, refreshCompanyProfile, role]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
