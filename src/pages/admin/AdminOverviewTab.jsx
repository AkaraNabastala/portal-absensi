import React, { useState, useEffect } from 'react';
import { 
    Users, 
    GraduationCap, 
    Award, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    ArrowRight,
    Sparkles,
    CalendarDays,
    Layers,
    ChevronRight,
    Activity,
    ShieldCheck
} from 'lucide-react';
import AttendanceDonut from '../../components/AttendanceDonut';

export default function AdminOverviewTab({ settings, setActiveTab, schoolInfo }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        try {
            const res = await fetch('/api/admin/dashboard-stats');
            const json = await res.json();
            if (json.success) {
                setData(json);
            }
        } catch (e) {
            console.error('Gagal mengambil statistik admin:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // Auto-refresh data admin setiap 10 detik agar log scan RFID gerbang langsung muncul live
        const interval = setInterval(loadStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const summary = data?.summary || {
        totalTeachers: 0,
        totalStudents: 0,
        totalDivisions: 0,
        totalEkskul: 0,
        rate: 100,
        todayStats: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 },
        totalRecorded: 0,
        pendingLeaves: 0
    };

    const recentLogs = data?.recentLogs || [];

    const formatIndoDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. HERO BANNER: BRANDING RESMI SEKOLAH & STATUS SINKRONISASI */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-[2rem] p-6 sm:p-8 text-white shadow-lg shadow-blue-900/10 relative overflow-hidden">
                {/* Aksen Bola Gradasi Halus */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-blue-100 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                            <span>Pusat Kendali Presensi Sekolah</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {schoolInfo?.school_name || 'NEBULA PRESENCE'}
                        </h2>
                        <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-xl leading-relaxed">
                            {schoolInfo?.school_address || 'Pemantauan presensi terpadu guru, siswa, kelas, dan kegiatan ekstrakurikuler.'}
                        </p>
                    </div>

                    {/* Badge Status Gateway Mesin */}
                    <div className="bg-black/25 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-left md:text-right shrink-0">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
                            Status Gateway Mesin
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-xs font-bold font-mono text-emerald-300">
                                Cloud Sync Siap
                            </span>
                        </div>
                        <span className="text-[10px] text-blue-200/70 font-mono block mt-1">
                            Tersinkron: {settings?.last_sync_at ? String(settings.last_sync_at).substring(11, 16) : 'Hari ini'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS (4 KARTU METRIK UTAMA) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Siswa */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Murid</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                            {summary.totalStudents}
                        </span>
                        <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Siswa Aktif</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                {/* Dewan Guru */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Dewan Guru</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                            {summary.totalTeachers}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Pendidik & Tendik</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                </div>

                {/* Rombel / Kelas */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Rombel / Kelas</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                            {summary.totalDivisions}
                        </span>
                        <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block">Kelas Terdaftar</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                {/* Ekstrakurikuler */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ekstrakurikuler</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
                            {summary.totalEkskul}
                        </span>
                        <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Kegiatan Aktif</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* 3. KOMPONEN DONUT CHART PERSIS GURU & SISWA */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Rekapitulasi Kehadiran Hari Ini</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Statistik kehadiran seluruh anggota sekolah secara real-time</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl">
                        Seluruh Sekolah
                    </span>
                </div>

                <AttendanceDonut
                    percentage={summary.rate}
                    stats={summary.todayStats}
                    title="Tingkat Hadir"
                />
            </div>

            {/* 4. DUA KOLOM: LIVE LOG TERAKHIR & PUSAT AKSES CEPAT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Kolom Kiri: Riwayat Scan Presensi Terbaru (Live Feed) */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <h3 className="text-base font-bold text-slate-900">Aktivitas Scan Presensi Terbaru</h3>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Terbaru</span>
                    </div>

                    {recentLogs.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                            Belum ada riwayat tap absensi yang masuk hari ini.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentLogs.map((log) => {
                                const isHadir = log.status === 'HADIR';
                                const isLate = log.status === 'TERLAMBAT';
                                const badgeColor = isHadir 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : isLate 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200';

                                return (
                                    <div key={log.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                                                {log.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
                                                    {log.full_name}
                                                </span>
                                                <span className="text-[11px] text-slate-400 block truncate">
                                                    {log.division || 'Umum'} • {log.role === 'guru' ? 'Dewan Guru' : 'Siswa'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 text-right">
                                            <div>
                                                <span className="text-xs font-mono font-bold text-slate-800 block">
                                                    {log.time_in || '--:--'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    {formatIndoDate(log.date)}
                                                </span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeColor}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Kolom Kanan: Pintasan Navigasi & Kartu Cepat */}
                <div className="space-y-4">
                    {/* Pintasan ke Ekskul */}
                    <div 
                        onClick={() => setActiveTab('ekskul')}
                        className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-sm transition cursor-pointer group space-y-2"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                            <Award className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                            Manajemen Ekstrakurikuler
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Kelola jadwal, cabang ekskul, dan penunjukan Guru Pembina resmi.
                        </p>
                        <div className="pt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
                            <span>Buka Ekskul</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                        </div>
                    </div>

                    {/* Pintasan ke Cloud Sync */}
                    <div 
                        onClick={() => setActiveTab('sync')}
                        className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-sm transition cursor-pointer group space-y-2"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            Cloud Sync & Secret Token
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Salin API Key acak dan URL gateway sinkronisasi untuk aplikasi desktop.
                        </p>
                        <div className="pt-2 flex items-center gap-1 text-xs font-bold text-indigo-600">
                            <span>Buka Kredensial</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
