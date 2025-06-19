import RegisterForm from "@/components/auth/RegisterForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro | ZYCLE',
  description: 'Cree una cuenta en ZYCLE para gestionar materiales aprovechables.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
