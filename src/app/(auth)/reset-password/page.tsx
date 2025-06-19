import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import type { Metadata } from 'next';
import { Suspense } from "react";

export const metadata: Metadata = {
  title: 'Establecer Nueva Contraseña | ZYCLE',
  description: 'Establezca una nueva contraseña para su cuenta ZYCLE.',
};

// Helper component to show loading state or handle suspense if needed
function ResetPasswordPageContent() {
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
