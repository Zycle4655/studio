import ZycleIcon from '@/components/icons/ZycleIcon';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <ZycleIcon className="w-10 h-10 text-primary" />
          <h1 className="text-5xl font-bold text-primary font-headline">ZYCLE</h1>
        </Link>
      </div>
      {children}
    </div>
  );
}
