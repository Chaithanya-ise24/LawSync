'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, Moon, Sun, Monitor, LogOut, Check } from 'lucide-react';

export default function ProfileDropdown() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  const isClient = typeof window !== 'undefined';

  const [user] = useState<{ email: string } | null>(() => {
    if (isClient) {
      const savedUser = localStorage.getItem('lawsync_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fixed: Changed 'let' to 'const' to satisfy the prefer-const ESLint rule
    const handle = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('lawsync_user');
    localStorage.removeItem('auth_token');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Catch network dropouts silently on cleanup
    }
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  if (!mounted) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="w-9 h-9 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
          <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-60 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700 shadow-2xl py-2"
          sideOffset={8}
          align="end"
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-white font-semibold text-sm">{user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-gray-400 text-xs truncate">{user?.email || 'No email'}</p>
          </div>

          {/* Theme Section */}
          <div className="px-2 py-2 border-b border-slate-700">
            <p className="text-gray-400 text-xs px-2 pb-1">Theme</p>
            <button
              onClick={() => setTheme('dark')}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-800'}`}
            >
              <Moon className="w-4 h-4" />
              Dark
              {theme === 'dark' && <Check className="w-3.5 h-3.5 ml-auto" />}
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'light' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-800'}`}
            >
              <Sun className="w-4 h-4" />
              Light
              {theme === 'light' && <Check className="w-3.5 h-3.5 ml-auto" />}
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition ${theme === 'system' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-slate-800'}`}
            >
              <Monitor className="w-4 h-4" />
              System
              {theme === 'system' && <Check className="w-3.5 h-3.5 ml-auto" />}
            </button>
          </div>

          {/* Account Settings */}
          <DropdownMenu.Item asChild>
            <a href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-300 text-sm hover:bg-slate-800 outline-none cursor-pointer transition">
              <User className="w-4 h-4" />
              Account Settings
            </a>
          </DropdownMenu.Item>

          {/* Logout */}
          <div className="border-t border-slate-700 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 text-sm hover:bg-red-500/10 outline-none cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}