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
        <header className="portal-topbar sticky top-0 z-30 text-white shadow-lg shadow-blue-950/10">
            <div className="h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-orange-400" />
            <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        {schoolInfo?.school_logo ? <img src={schoolInfo.school_logo} alt="Logo instansi" className="h-10 w-10 object-contain" /> : <School className="h-7 w-7 text-sky-300" />}
                    </div>
                    <div className="min-w-0">
                        <p className="max-w-[42vw] truncate text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300 sm:text-[11px]">{schoolInfo?.school_name || 'NEBULA PRESENCE'}</p>
                        <h2 className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">{tabLabels[activeTab] || 'Beranda'}</h2>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 sm:flex">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 text-white"><UserRound size={16} /></span>
                        <div className="max-w-40">
                            <p className="truncate text-xs font-bold text-white">{displayName}</p>
                            <p className="text-[10px] font-medium text-sky-200">{roleLabel}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-xs font-bold text-white transition hover:border-rose-300/40 hover:bg-rose-500/15 hover:text-rose-100" title="Keluar dari portal">
                        <LogOut size={15} /><span className="hidden sm:inline">Keluar</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
