import React, { useState } from 'react';
import { 
    LayoutDashboard, 
    CalendarDays, 
    BarChart3, 
    FileText, 
    User, 
    Users, 
    LogOut, 
    School,
    GraduationCap,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    BookOpen,
    Award
} from 'lucide-react';

export default function Sidebar({ currentUser, activeTab, setActiveTab, onLogout, schoolInfo }) {
    const isTeacher = currentUser?.role === 'TEACHER';
    const isAdmin = currentUser?.role === 'ADMIN';
    const isWaliKelas = isTeacher && currentUser?.teacher?.is_wali_kelas;
    const isPenanggungJawab = isTeacher && currentUser?.teacher?.is_penanggung_jawab;
    const canManageClass = isWaliKelas || isPenanggungJawab;
    const assignedClass = currentUser?.teacher?.assigned_division || 'Kelas';

    // Dropdown terbuka otomatis jika tab aktif adalah salah satu submenu kelas
    const isClassTabActive = ['class_daily', 'class_monthly', 'class_leave', 'class_students'].includes(activeTab);
    const [isClassOpen, setIsClassOpen] = useState(true);

    // 0. Menu Khusus Administrator
    const adminMenus = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'admin_schedules', label: 'Jadwal & Guru Mapel', icon: CalendarDays },
        { id: 'admin_journals', label: 'Monitoring Jurnal', icon: BookOpen },
        { id: 'ekskul', label: 'Ekskul & Pembina', icon: Users },
        { id: 'sync', label: 'Cloud Sync', icon: FileText },
        { id: 'substitutes', label: 'Izin & Pengganti', icon: Users },
    ];

    // 1. Menu Pribadi (Siswa / Wali Murid)
    const parentMenus = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'daily', label: 'Presensi Gerbang', icon: CalendarDays },
        { id: 'subject_att', label: 'Presensi Mapel', icon: BookOpen },
        { id: 'ekskul_att', label: 'Presensi Ekskul', icon: Award },
        { id: 'leave', label: 'Izin', icon: FileText },
        { id: 'profile', label: 'Biodata', icon: User },
    ];

    // 2. Menu Pribadi Guru / Tendik
    const teacherPersonalMenus = [
        { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
        { id: 'daily', label: 'Presensi', icon: CalendarDays },
        { id: 'leave', label: 'Izin', icon: FileText },
        { id: 'profile', label: 'Biodata', icon: User },
    ];

    // 2.5. Menu Pembelajaran & Ekskul Guru
    const teacherTeachingMenus = [
        { id: 'teacher_journal', label: 'Jurnal Mengajar', icon: BookOpen },
        { id: 'teacher_ekskul', label: 'Ekskul Binaan', icon: Award },
    ];

    // 3. Menu Khusus Kelas Binaan (Hanya untuk Wali Kelas, 1 kata ringkas)
    const waliKelasMenus = canManageClass ? [
        { id: 'class_daily', label: 'Presensi', icon: CalendarDays },
        { id: 'class_monthly', label: 'Rekap', icon: BarChart3 },
        { id: 'class_leave', label: 'Izin', icon: CheckSquare },
        { id: 'class_students', label: 'Siswa', icon: Users },
    ] : [];

    const personalMenus = isAdmin ? adminMenus : (isTeacher ? teacherPersonalMenus : parentMenus);

    const displayName = isAdmin
        ? (currentUser?.nama_admin || currentUser?.username || 'Administrator')
        : (isTeacher ? currentUser?.teacher?.full_name : currentUser?.student?.full_name || 'Pengguna');

    const photoUrl = isTeacher ? currentUser?.teacher?.photo_url : currentUser?.student?.photo_url;

    return (
        <aside className="hidden md:flex flex-col w-72 fixed inset-y-0 left-0 bg-white border-r border-slate-200/80 z-30 select-none shadow-sm">
            {/* Header Instansi */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                {schoolInfo?.school_logo ? (
                    <img 
                        src={schoolInfo.school_logo} 
                        alt="Logo" 
                        className="w-10 h-10 object-contain shrink-0" 
                    />
                ) : (
                    <School className="w-8 h-8 text-blue-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-snug break-words">
                        {schoolInfo?.school_name || 'NEBULA PRESENCE'}
                    </h1>
                    <span className="text-xs text-blue-600 font-semibold block mt-0.5">
                        NEBULA PRESENCE
                    </span>
                </div>
            </div>

            {/* Profil Mini Pengguna */}
            <div className="p-3 mx-3 my-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-12 h-16 rounded-xl overflow-hidden bg-blue-100 border border-slate-200 shadow-2xs shrink-0 relative flex items-center justify-center">
                    <span className="font-extrabold text-blue-700 text-sm select-none">
                        {displayName.charAt(0) || 'U'}
                    </span>
                    {photoUrl && (
                        <img
                            src={photoUrl}
                            alt={displayName}
                            className="absolute inset-0 w-full h-full object-cover object-center bg-white"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                    {isAdmin ? (
                        <>
                            <div className="text-xs text-blue-600 font-semibold truncate mt-0.5">
                                Administrator
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                                Sistem Absensi
                            </div>
                        </>
                    ) : isTeacher ? (
                        <>
                            <div className="text-xs text-blue-600 font-semibold truncate mt-0.5">
                                {isWaliKelas
                                    ? `Wali Kelas ${currentUser.teacher.assigned_division}`
                                    : (currentUser?.teacher?.role === 'tendik' ? 'Tendik' : 'Dewan Guru')}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                                NIP: {currentUser?.teacher?.nip || '-'}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-blue-600 font-semibold truncate mt-0.5">
                                Kelas: {currentUser?.student?.division || '-'}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                                NISN: {currentUser?.student?.nisn || '-'}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Navigasi Menu */}
            <nav className="flex-1 px-3 space-y-4 overflow-y-auto pt-1">
                {/* Menu Presensi Pribadi */}
                <div>
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Presensi Pribadi
                    </div>
                    <div className="space-y-1 mt-1">
                        {personalMenus.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Menu Khusus Pembelajaran & Ekskul untuk Guru */}
                {isTeacher && (
                    <div className="pt-2 border-t border-slate-100">
                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Pembelajaran & Ekskul
                        </div>
                        <div className="space-y-1 mt-1">
                            {teacherTeachingMenus.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Menu Khusus Kelas Binaan (Dropdown Collapsible untuk Wali Kelas) */}
                {canManageClass && (
                    <div className="pt-2 border-t border-slate-100">
                        {/* Dropdown Header Button */}
                        <button
                            type="button"
                            onClick={() => setIsClassOpen(prev => !prev)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                isClassTabActive 
                                    ? 'bg-blue-50/70 text-blue-700' 
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <GraduationCap className={`w-4 h-4 shrink-0 ${isClassTabActive ? 'text-blue-600' : 'text-slate-500'}`} />
                                <span className="truncate">{isWaliKelas ? `Kelas ${assignedClass}` : 'Penanggung Jawab'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-blue-100/70 text-blue-700">
                                    {isWaliKelas ? 'Wali' : 'PJ'}
                                </span>
                                {isClassOpen ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        </button>

                        {/* Dropdown Items (1 kata ringkas) */}
                        {isClassOpen && (
                            <div className="mt-1 ml-3 pl-2.5 border-l-2 border-slate-100 space-y-0.5">
                                {waliKelasMenus.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Footer Sidebar */}
            <div className="p-3 border-t border-slate-100 space-y-2">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                </button>
                <div className="text-center text-xs text-slate-400 pt-1">
                    Nebula Presence • v2.0
                </div>
            </div>
        </aside>
    );
}
