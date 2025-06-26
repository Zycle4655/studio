import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
           <Image 
            src="https://placehold.co/240x60.png" 
            alt="Zycle Logo" 
            width={240} 
            height={60} 
            data-ai-hint="zycle logo"
            priority
          />
        </Link>
      </div>
      {children}
    </div>
  );
}
