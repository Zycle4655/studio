
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth(); // Use the auth context

  useEffect(() => {
    if (!loading) { // Only redirect once loading is complete
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Display a loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }
  
  // Fallback content, though ideally redirect should happen before this renders
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirigiendo...</p>
    </div>
  );
}
