import React from 'react';
import { School, LogOut, User, Sparkles, BookOpen, Award, BarChart3, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, onLogout, schoolInfo }) {
    const isTeacher = currentUser?.role === 'TEACHER';
    const isAdmin = currentUser?.role === 'ADMIN';
    const displayName = isAdmin
        ? (currentUser?.nama_admin || currentUser?.username || 'Administrator')
        : (isTeacher 
            ? currentUser?.teacher?.full_name 
            : currentUser?.student?.full_name || 'Pengguna');

    // Label tab aktif untuk Desktop Breadcrumb (ringkas & bersih)
    const tabLabels = {
        overview: 'Beranda',
        daily: 'Presensi Pribadi',
        leave: 'Izin',
        profile: 'Biodata',
        subject_att: 'Presensi Mapel Siswa',
        ekskul_att: 'Presensi Ekskul Siswa',
        teacher_journal: 'Jurnal Mengajar',
        teacher_ekskul: 'Ekskul Binaan',
        admin_schedules: 'Atur Jadwal & Guru Mapel',
        admin_journals: 'Monitoring Jurnal',
        ekskul: 'Ekstrakurikuler & Pembina',
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

            </div>
        </header>
    );
}
