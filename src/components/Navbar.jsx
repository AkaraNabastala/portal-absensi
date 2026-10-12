import React from 'react';
import { School, LogOut, User } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, onLogout, schoolInfo }) {
    const isTeacher = currentUser?.role === 'TEACHER';
    const displayName = isTeacher 
        ? currentUser?.teacher?.full_name 
        : currentUser?.student?.full_name || 'Pengguna';

    // Label tab aktif untuk Desktop Breadcrumb (ringkas & bersih)
    const tabLabels = {
        overview: 'Beranda',
        daily: 'Presensi',
        leave: 'Izin',
        profile: 'Biodata',
        ekskul: 'Ekstrakurikuler',
        sync: 'Cloud Sync',
        class_daily: 'Presensi Kelas',
        class_monthly: 'Rekap Kelas',
        class_leave: 'Izin Siswa',
        class_students: 'Daftar Siswa'
    };

    return (
        <header className="sticky top-0 z-20 bg-white/95 border-b border-slate-200/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                
                {/* Sisi Kiri: Logo murni tanpa border/background kaku */}
                <div className="flex items-center gap-3">
                    {/* Hanya tampil di Mobile (di Desktop logo sudah ada di Sidebar) */}
                    <div className="flex md:hidden items-center gap-2.5">
                        {schoolInfo?.school_logo ? (
                            <img 
                                src={schoolInfo.school_logo} 
                                alt="Logo" 
                                className="w-8 h-8 object-contain" 
                            />
                        ) : (
                            <School className="w-6 h-6 text-blue-600" />
                        )}
                        <div className="min-w-0">
                            <span className="font-black text-xs text-slate-900 tracking-tight leading-snug break-words block max-w-[220px]">
                                {schoolInfo?.school_name || 'NEBULA PRESENCE'}
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold block">Portal Presensi</span>
                        </div>
                    </div>

                    {/* Judul Tab di Layar Desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Portal /</span>
                        <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                            {tabLabels[activeTab] || 'Beranda'}
                        </h2>
                    </div>
                </div>

                {/* Sisi Kanan: Sangat ringkas & minimalis (tidak ramai) */}
                <div className="flex items-center gap-3">
                    {/* Nama Pengguna Ringkas */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="max-w-[150px] truncate">{displayName}</span>
                        <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {isTeacher ? (currentUser?.teacher?.role === 'tendik' ? 'Tendik' : 'Guru') : 'Siswa'}
                        </span>
                    </div>

                    {/* Tombol Logout Minimalis */}
                    {currentUser && (
                        <button
                            onClick={onLogout}
                            title="Keluar"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Keluar</span>
                        </button>
                    )}
                </div>

            </div>
        </header>
    );
}
