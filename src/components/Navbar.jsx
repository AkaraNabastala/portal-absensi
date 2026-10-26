import React from 'react';
import { School, LogOut, UserRound } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, onLogout, schoolInfo }) {
    const isTeacher = currentUser?.role === 'TEACHER';
    const isAdmin = currentUser?.role === 'ADMIN';
    const displayName = isAdmin
        ? (currentUser?.nama_admin || currentUser?.username || 'Administrator')
        : (isTeacher ? currentUser?.teacher?.full_name : currentUser?.student?.full_name || 'Pengguna');
    const tabLabels = {
        overview: 'Beranda', daily: 'Presensi Pribadi', leave: 'Izin', profile: 'Biodata',
        subject_att: 'Presensi Mata Pelajaran', ekskul_att: 'Presensi Ekstrakurikuler',
        teacher_journal: 'Jurnal Mengajar', teacher_ekskul: 'Ekskul Binaan',
        admin_schedules: 'Jadwal & Guru Mapel', admin_journals: 'Monitoring Jurnal',
        ekskul: 'Ekstrakurikuler & Pembina', sync: 'Sinkronisasi Portal',
        class_daily: 'Presensi Kelas', class_monthly: 'Rekap Kelas',
        class_leave: 'Izin Siswa', class_students: 'Daftar Siswa'
    };
    const roleLabel = isAdmin ? 'Administrator' : isTeacher ? 'Guru / Tendik' : 'Siswa / Wali Murid';

    return (
        <header className="portal-topbar sticky top-0 z-30">
            <div className="h-[3px] bg-gradient-to-r from-sky-300 via-sky-500 to-orange-300" />
            <div className="mx-auto flex min-h-[68px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-sky-100">
                        {schoolInfo?.school_logo ? <img src={schoolInfo.school_logo} alt="Logo instansi" className="h-9 w-9 object-contain" /> : <School className="h-6 w-6 text-sky-700" />}
                    </div>
                    <div className="min-w-0">
                        <p className="portal-brand-eyebrow max-w-[42vw] truncate text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]">{schoolInfo?.school_name || 'NEBULA PRESENCE'}</p>
                        <h2 className="portal-page-title truncate text-sm font-extrabold tracking-tight sm:text-base">{tabLabels[activeTab] || 'Beranda'}</h2>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="portal-user-chip hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex">
                        <span className="portal-user-icon flex h-8 w-8 items-center justify-center rounded-lg"><UserRound size={16} /></span>
                        <div className="max-w-40">
                            <p className="portal-user-name truncate text-xs font-bold">{displayName}</p>
                            <p className="portal-user-role text-[10px] font-medium">{roleLabel}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onLogout} className="portal-logout inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition" title="Keluar dari portal">
                        <LogOut size={15} /><span className="hidden sm:inline">Keluar</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
