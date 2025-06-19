import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | ZYCLE',
  description: 'Inicie sesión en su cuenta ZYCLE para gestionar materiales aprovechables.',
};

export default function LoginPage() {
  return <LoginForm />;
}
