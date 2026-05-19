'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { GlassCard } from '@/components/ui/GlassCard';
import { User, Mail, Phone, Save, LogOut, Shield, Camera } from 'lucide-react';

interface UserData {
  email: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const savedUser = localStorage.getItem('lawsync_user');
      if (!savedUser) {
        router.push('/login');
        return;
      }
      
      const userData: UserData = JSON.parse(savedUser);
      setEmail(userData.email || '');
      
      const savedProfile = localStorage.getItem('lawsync_profile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setFullName(profile.fullName || '');
        setPhone(profile.phone || '');
      }
      
      setLoading(false);
    };
    loadProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    
    const profileData = { fullName, phone };
    localStorage.setItem('lawsync_profile', JSON.stringify(profileData));
    
    setTimeout(() => {
      alert('Profile saved successfully!');
      setSaving(false);
    }, 500);
  };

  const handleLogout = async () => {
    localStorage.removeItem('lawsync_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('lawsync_profile');
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Account Settings</h1>
              <p className="text-gray-400 mt-1">Manage your profile and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Avatar & Info */}
              <div className="lg:col-span-1">
                <GlassCard className="p-6 text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                      <span className="text-white text-3xl font-bold">
                        {email ? email.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <button className="absolute bottom-0 right-0 bg-slate-700 p-1.5 rounded-full hover:bg-slate-600 transition">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <h2 className="text-white font-semibold text-xl mt-4">{fullName || email?.split('@')[0] || 'User'}</h2>
                  <p className="text-gray-400 text-sm">{email}</p>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                      <Shield className="w-4 h-4" />
                      <span>Account Active</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Right Column - Edit Form */}
              <div className="lg:col-span-2">
                <GlassCard className="p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">Profile Information</h3>
                  
                  <div className="space-y-4">
                    {/* Email (Read-only) */}
                    <div>
                      {/* Fixed: Removed 'block' to clear the display style conflict */}
                      <label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-gray-400 outline-none cursor-not-allowed"
                      />
                      <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
                    </div>

                    {/* Full Name */}
                    <div>
                      {/* Fixed: Removed 'block' to clear the display style conflict */}
                      <label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      {/* Fixed: Removed 'block' to clear the display style conflict */}
                      <label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-2.5 rounded-lg font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 py-2.5 rounded-lg font-semibold text-red-400 transition flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </GlassCard>

                {/* Danger Zone */}
                <GlassCard className="p-6 mt-6 border border-red-500/20">
                  <h3 className="text-red-400 font-semibold text-lg mb-2">Danger Zone</h3>
                  <p className="text-gray-400 text-sm mb-4">Once you delete your account, there is no going back.</p>
                  <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm transition">
                    Delete Account
                  </button>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}