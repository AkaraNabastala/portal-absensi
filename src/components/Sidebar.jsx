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
    const hasAssignedClass = !!(currentUser?.teacher?.assigned_division || currentUser?.teacher?.managed_divisions?.length);
    const canManageClass = (isWaliKelas || isPenanggungJawab) && hasAssignedClass;
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
        { id: 'teacher_absence', label: isPenanggungJawab ? 'Izin & Pengganti' : 'Izin Mengajar', icon: FileText },
    ];
    const visibleTeacherTeachingMenus = teacherTeachingMenus.filter(item => {
        if (item.id === 'teacher_journal') return !!currentUser?.teacher?.has_teaching_schedule;
        if (item.id === 'teacher_ekskul') return !!currentUser?.teacher?.is_mentor;
        return true;
    });

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
        <aside className="hidden md:flex flex-col w-72 fixed inset-y-0 left-0 bg-[#101c30] border-r border-white/10 z-30 select-none shadow-[8px_0_28px_rgba(16,28,48,0.08)]">
            {/* Header Instansi */}
            <div className="p-5 border-b border-white/10 flex items-center gap-3">
                {schoolInfo?.school_logo ? (
                    <img 
                        src={schoolInfo.school_logo} 
                        alt="Logo" 
                        className="w-10 h-10 object-contain shrink-0" 
                    />
                ) : (
                    <School className="w-8 h-8 text-sky-300 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="font-bold text-sm text-white tracking-tight leading-snug break-words">
                        {schoolInfo?.school_name || 'NEBULA PRESENCE'}
                    </h1>
                    <span className="text-xs text-sky-300 font-semibold block mt-0.5">
                        NEBULA PRESENCE
                    </span>
                </div>
            </div>

            {/* Profil Mini Pengguna */}
            <div className="p-3 mx-3 my-3 bg-white/[0.06] rounded-2xl border border-white/10 flex items-center gap-3">
                <div className="w-12 h-16 rounded-xl overflow-hidden bg-sky-400/10 border border-white/10 shadow-2xs shrink-0 relative flex items-center justify-center">
                    <span className="font-extrabold text-sky-200 text-sm select-none">
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
                    <div className="text-sm font-bold text-white truncate">{displayName}</div>
                    {isAdmin ? (
                        <>
                            <div className="text-xs text-sky-300 font-semibold truncate mt-0.5">
                                Administrator
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                                Sistem Absensi
                            </div>
                        </>
                    ) : isTeacher ? (
                        <>
                            <div className="text-xs text-sky-300 font-semibold truncate mt-0.5">
                                {isPenanggungJawab
                                    ? 'Penanggung Jawab'
                                    : (isWaliKelas ? `Wali Kelas ${currentUser.teacher.assigned_division || assignedClass}` : (currentUser?.teacher?.role === 'tendik' || currentUser?.teacher?.role === 'TENDIK' ? 'Tendik' : 'Dewan Guru'))}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                                NIP: {currentUser?.teacher?.nip || '-'}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-sky-300 font-semibold truncate mt-0.5">
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
            <nav className="flex-1 px-3 space-y-4 overflow-y-auto pt-1 custom-scrollbar">
                {/* Menu Presensi Pribadi */}
                <div>
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
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
                                            ? 'bg-sky-400/12 text-white font-bold border-l-2 border-sky-300'
                                            : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-300' : 'text-slate-500'}`} />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Menu Khusus Pembelajaran & Ekskul untuk Guru */}
                {isTeacher && visibleTeacherTeachingMenus.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Pembelajaran & Ekskul
                        </div>
                        <div className="space-y-1 mt-1">
                            {visibleTeacherTeachingMenus.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-sky-400/12 text-white font-bold border-r-2 border-sky-300'
                                                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Menu Khusus Kelas Binaan (Dropdown Collapsible untuk Wali Kelas) */}
                {canManageClass && (
                    <div className="pt-2 border-t border-white/10">
                        {/* Dropdown Header Button */}
                        <button
                            type="button"
                            onClick={() => setIsClassOpen(prev => !prev)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                isClassTabActive 
                                    ? 'bg-sky-400/10 text-sky-100' 
                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <GraduationCap className={`w-4 h-4 shrink-0 ${isClassTabActive ? 'text-sky-300' : 'text-slate-500'}`} />
                                <span className="truncate">{isWaliKelas ? `Kelas ${assignedClass}` : 'Penanggung Jawab'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-sky-400/15 text-sky-200">
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
                            <div className="mt-1 ml-3 pl-2.5 border-l-2 border-white/10 space-y-0.5">
                                {waliKelasMenus.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-sky-400/15 text-white border border-sky-300/20'
                                                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
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
            <div className="p-3 border-t border-white/10 space-y-2">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                </button>
                <div className="text-center text-[10px] text-slate-500 pt-1">
                    Nebula Presence • v2.0
                </div>
            </div>
        </aside>
    );
}
