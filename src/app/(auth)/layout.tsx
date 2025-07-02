import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
           <h1 className="text-5xl font-bold text-primary tracking-wider font-headline">Zycle</h1>
        </Link>
      </div>
      {children}
    </div>
  );
}
