import React, { useState, useRef, useEffect } from 'react';
import { 
    LayoutDashboard, 
    CalendarDays, 
    BarChart3, 
    FileText, 
    User, 
    GraduationCap, 
    MoreHorizontal,
    CheckSquare,
    Users,
    X,
    ChevronRight,
    BookOpen,
    Award
} from 'lucide-react';

export default function BottomNav({ currentUser, activeTab, setActiveTab }) {
    const isTeacher = currentUser?.role === 'TEACHER';
    const isAdmin = currentUser?.role === 'ADMIN';
    const isStudent = !isTeacher && !isAdmin;
    const isWaliKelas = isTeacher && currentUser?.teacher?.is_wali_kelas;
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const menuRef = useRef(null);

    // Tutup popup jika klik di luar
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMoreMenu(false);
            }
        }
        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMoreMenu]);

    // 0. Menu Navigasi Utama untuk Administrator
    const adminPrimaryItems = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'admin_schedules', label: 'Jadwal', icon: CalendarDays },
        { id: 'admin_journals', label: 'Jurnal', icon: BookOpen },
        { id: 'attendance_monitoring', label: 'Hadir', icon: CheckSquare },
        { id: 'more', label: 'Lainnya', icon: MoreHorizontal, isAction: true },
    ];

    // 1. Menu Navigasi Utama untuk Siswa / Wali Murid
    const parentPrimaryItems = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'daily', label: 'Gerbang', icon: CalendarDays },
        { id: 'subject_att', label: 'Mapel', icon: BookOpen },
        { id: 'ekskul_att', label: 'Ekskul', icon: Award },
        { id: 'more', label: 'Lainnya', icon: MoreHorizontal, isAction: true },
    ];

    // 2. Menu Navigasi Utama untuk Guru (Bukan Wali Kelas)
    const teacherStandardItems = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'daily', label: 'Presensi', icon: CalendarDays },
        { id: 'teacher_journal', label: 'Jurnal', icon: BookOpen },
        { id: 'teacher_ekskul', label: 'Ekskul', icon: Award },
        { id: 'more', label: 'Lainnya', icon: MoreHorizontal, isAction: true },
    ];

    // 3. Menu Navigasi Utama untuk Guru Wali Kelas:
    const waliPrimaryItems = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'daily', label: 'Presensi', icon: CalendarDays },
        { id: 'teacher_journal', label: 'Jurnal', icon: BookOpen },
        { id: 'teacher_ekskul', label: 'Ekskul', icon: Award },
        { id: 'more', label: 'Lainnya', icon: MoreHorizontal, isAction: true },
    ];

    const assignedClass = currentUser?.teacher?.assigned_division || 'Binaan';

    // Menu tambahan yang tampil di popup drawer "Lainnya" (...)
    const drawerItems = isAdmin ? [
        { section: 'Administrasi', items: [
            { id: 'users', label: 'Users Guru & Siswa', desc: 'Kelola data dan kredensial login', icon: Users },
            { id: 'admin_profile', label: 'Profil Admin', desc: 'Atur username dan password admin', icon: User },
            { id: 'subject_attendance', label: 'Presensi Mapel', desc: 'Monitoring presensi setiap pelajaran', icon: BookOpen },
            { id: 'ekskul', label: 'Monitoring Ekskul', desc: 'Pantau kegiatan ekstrakurikuler', icon: Award },
            { id: 'sync', label: 'Cloud Sync', desc: 'Status sinkronisasi data', icon: FileText },
            { id: 'substitutes', label: 'Izin & Guru Pengganti', desc: 'Kelola pengajuan dan pengganti', icon: CheckSquare },
        ]}
    ] : isStudent ? [
        {
            section: 'Menu Siswa / Wali Murid',
            items: [
                { id: 'leave', label: 'Surat Izin', desc: 'Pengajuan izin & sakit siswa', icon: FileText },
                { id: 'profile', label: 'Biodata Siswa', desc: 'Informasi data pokok siswa', icon: User },
            ]
        }
    ] : (isWaliKelas ? [
        {
            section: `Kelas ${assignedClass}`,
            items: [
                { id: 'class_daily', label: 'Presensi Kelas', desc: 'Presensi harian siswa', icon: CalendarDays },
                { id: 'class_monthly', label: 'Rekap Kelas', desc: 'Rekapitulasi bulanan siswa', icon: BarChart3 },
                { id: 'class_leave', label: 'Izin Siswa', desc: 'Kelola surat izin siswa', icon: CheckSquare },
                { id: 'class_students', label: 'Daftar Siswa', desc: 'Daftar murid kelas', icon: Users },
            ]
        },
        {
            section: 'Menu Guru',
            items: [
                { id: 'leave', label: 'Izin Pribadi', desc: 'Permohonan izin guru', icon: FileText },
                { id: 'profile', label: 'Biodata Guru', desc: 'Profil data pengajar', icon: User },
            ]
        }
    ] : [
        {
            section: 'Menu Guru',
            items: [
                { id: 'leave', label: 'Izin Pribadi', desc: 'Permohonan izin guru', icon: FileText },
                { id: 'profile', label: 'Biodata Guru', desc: 'Profil data pengajar', icon: User },
            ]
        }
    ]);

    let items = parentPrimaryItems;
    if (isAdmin) {
        items = adminPrimaryItems;
    } else if (isTeacher) {
        items = isWaliKelas ? waliPrimaryItems : teacherStandardItems;
    }

    // Tab yang berada di dalam popup drawer "Lainnya"
    const moreTabIds = ['leave', 'profile', 'class_daily', 'class_monthly', 'class_leave', 'class_students', 'users', 'admin_profile', 'subject_attendance', 'ekskul', 'sync', 'substitutes'];
    const isTabInMore = moreTabIds.includes(activeTab);

    const activeIndex = items.findIndex(i => {
        if (i.id === 'more' && isTabInMore) return true;
        if (i.matchPrefix && activeTab.startsWith(i.matchPrefix)) return true;
        return i.id === activeTab;
    });

    const handleItemClick = (item) => {
        if (item.isAction) {
            setShowMoreMenu(prev => !prev);
        } else {
            setActiveTab(item.id);
            setShowMoreMenu(false);
        }
    };

    return (
        <>
            {/* BACKDROP & POPUP MENU TITIK-TITIK (...) DENGAN JUDUL "LAINNYA" */}
            {showMoreMenu && (
                <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200">
                    <div 
                        ref={menuRef}
                        className="portal-mobile-drawer bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto border-t p-5 pb-8 space-y-5 shadow-[0_-16px_50px_rgba(16,28,48,.16)] animate-in slide-in-from-bottom duration-300"
                    >
                        {/* Header Modal Judul "Lainnya" */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="portal-drawer-icon w-8 h-8 rounded-xl flex items-center justify-center">
                                    <MoreHorizontal className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Lainnya</h3>
                                    <p className="portal-drawer-subtitle text-[11px]">Menu kelas binaan dan menu lainnya</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowMoreMenu(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* List Menu Section */}
                        {drawerItems.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-2">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                    {group.section}
                                </div>
                                <div className="space-y-1.5">
                                    {group.items.map((m) => {
                                        const Icon = m.icon;
                                        const isCurrent = activeTab === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setActiveTab(m.id);
                                                    setShowMoreMenu(false);
                                                }}
                                                className={`portal-drawer-item w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${isCurrent ? 'portal-drawer-item-active shadow-sm' : 'hover:bg-sky-50'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`portal-drawer-item-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isCurrent ? '' : ''}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`text-[14px] font-bold truncate ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                                                            {m.label}
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">
                                                            {m.desc}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-blue-600' : 'text-slate-300'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BOTTOM NAV BAR UTAMA */}
            <nav className="portal-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 rounded-t-2xl rounded-b-none border-x-0 border-b-0 px-2 pt-2 pb-2 safe-area-bottom transform-gpu">
                <div className="relative flex justify-around items-center max-w-md mx-auto">
                    {/* Active Indicator Backdrop */}
                    <div
                        className="portal-nav-active absolute top-0 bottom-0 rounded-xl border transition-all duration-300 ease-out pointer-events-none"
                        style={{
                            width: `${100 / items.length}%`,
                            left: `${(activeIndex >= 0 ? activeIndex : 0) * (100 / items.length)}%`
                        }}
                    />

                    {items.map((item) => {
                        const Icon = item.icon;
                        const isMoreActive = item.id === 'more' && (showMoreMenu || isTabInMore);
                        const isNormalActive = (item.matchPrefix && activeTab.startsWith(item.matchPrefix)) || activeTab === item.id;
                        const isActive = isMoreActive || isNormalActive;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className={`flex-1 py-1.5 flex flex-col items-center justify-center relative z-10 transition-all cursor-pointer ${
                                    isActive 
                                        ? 'portal-nav-item-active font-bold scale-105' 
                                        : 'portal-nav-item hover:text-slate-900'
                                }`}
                            >
                                <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-1.5'}`} />
                                <span className={`text-[11px] font-semibold tracking-tight ${isActive ? 'portal-nav-item-active' : 'portal-nav-item'}`}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
