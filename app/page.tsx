'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to login page after 1 second
    const timer = setTimeout(() => {
      router.push('/login');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-900 via-purple-800 to-pink-700 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="w-20 h-20 bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
          <span className="text-white font-bold text-3xl">L</span>
        </div>
        
        {/* Loading Text */}
        <h1 className="text-3xl font-bold text-white mb-2">
          LawSync
        </h1>
        <p className="text-white/60 mb-4">
          Your AI Legal Assistant
        </p>
        
        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
        
        <p className="text-white/40 text-sm mt-4">
          Redirecting you to login...
        </p>
      </div>
    </div>
  );
}