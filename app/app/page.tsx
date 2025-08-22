
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="text-gray-600 dark:text-gray-300">Loading Project Foundry PSA...</p>
      </div>
    </div>
  );
}
