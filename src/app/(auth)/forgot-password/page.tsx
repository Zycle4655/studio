import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | ZYCLE',
  description: 'Restablezca su contraseña de ZYCLE.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
