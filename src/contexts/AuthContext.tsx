
"use client";

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import type { CompanyProfileDocument } from "@/schemas/company";
import type { CollaboratorDocument, DefaultRole, DEFAULT_ROLES } from "@/schemas/equipo";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyProfile: CompanyProfileDocument | null;
  refreshCompanyProfile: () => Promise<void>;
  role: DefaultRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileDocument | null>(null);
  const [role, setRole] = useState<DefaultRole | null>(null); 

  const fetchInitialData = useCallback(async (currentUser: User) => {
    if (!db) return;

    // Path 1: Check if the user is an admin (has a direct company profile)
    const adminProfileRef = doc(db, "companyProfiles", currentUser.uid);
    const adminProfileSnap = await getDoc(adminProfileRef);

    if (adminProfileSnap.exists()) {
      setCompanyProfile(adminProfileSnap.data() as CompanyProfileDocument);
      setRole('admin');
      return;
    }
    
    // Path 2: Check if the user is a collaborator by looking in userMappings
    const userMappingRef = doc(db, "userMappings", currentUser.uid);
    const userMappingSnap = await getDoc(userMappingRef);

    if (userMappingSnap.exists()) {
      const { adminUid } = userMappingSnap.data();
      
      // Fetch the admin's company profile
      const companyProfileRef = doc(db, "companyProfiles", adminUid);
      const companyProfileSnap = await getDoc(companyProfileRef);

      if (companyProfileSnap.exists()) {
        setCompanyProfile(companyProfileSnap.data() as CompanyProfileDocument);

        // Fetch collaborator's specific role from the admin's subcollection
        const collaboratorsRef = collection(db, "companyProfiles", adminUid, "collaborators");
        const q = query(collaboratorsRef, where("authUid", "==", currentUser.uid), limit(1));
        const collaboratorQuerySnap = await getDocs(q);

        if (!collaboratorQuerySnap.empty) {
          const collaboratorData = collaboratorQuerySnap.docs[0].data() as CollaboratorDocument;
           if (collaboratorData.permissions.equipo) {
              setRole('admin');
           } else if (collaboratorData.permissions.gestionMaterial) {
              setRole('bodeguero');
           } else if (collaboratorData.permissions.transporte) {
              setRole('recolector');
           } else {
               setRole('bodeguero'); // Fallback default role for collaborator
           }
        } else {
          console.error("Auth Error: User mapping exists but no corresponding collaborator document found.");
          setCompanyProfile(null);
          setRole(null);
        }
      } else {
        console.error("Auth Error: Collaborator's admin company profile not found.");
        setCompanyProfile(null);
        setRole(null);
      }
      return;
    }
    
    // Path 3: User is not an admin and not a collaborator (e.g., new admin yet to create a profile)
    setCompanyProfile(null);
    setRole('admin'); // Assume new user is an admin for profile setup redirect
  }, []);


  const refreshCompanyProfile = useCallback(async () => {
    if(user) {
        await fetchInitialData(user);
    }
  }, [user, fetchInitialData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (currentUser) {
        await fetchInitialData(currentUser);
      } else {
        setCompanyProfile(null);
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchInitialData]);

  const value = useMemo(() => ({
    user,
    loading,
    companyProfile,
    refreshCompanyProfile,
    role,
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
