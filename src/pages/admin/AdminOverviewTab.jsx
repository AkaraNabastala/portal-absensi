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
            {/* HERO: identitas sekolah dan status sinkronisasi yang tidak mengklaim koneksi palsu */}
            <section className="relative isolate overflow-hidden rounded-[2rem] border border-sky-200/80 bg-gradient-to-br from-sky-100 via-white to-orange-50 p-5 shadow-[0_18px_55px_rgba(28,100,160,0.10)] sm:p-7">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-300 via-blue-600 to-orange-400" />
                <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-sky-300/35 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 right-1/3 h-36 w-36 rounded-full bg-orange-200/45 blur-3xl" />
                <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950 via-blue-700 to-sky-400 text-white shadow-lg shadow-blue-900/15">
                            <GraduationCap className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-800">
                                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                                Pusat kendali presensi
                            </div>
                            <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                {schoolInfo?.school_name || 'NEBULA PRESENCE'}
                            </h2>
                            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                                {schoolInfo?.school_address || 'Pantau kehadiran, aktivitas kelas, dan kegiatan sekolah dari satu ruang kerja.'}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-blue-950/10 bg-[#101c30] p-4 text-white shadow-xl shadow-blue-950/15">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-sky-200">Koneksi Portal</span>
                            <span className={`h-2.5 w-2.5 rounded-full ${settings?.last_sync_at ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                        </div>
                        <p className="mt-2 text-base font-extrabold">{settings?.last_sync_at ? 'Pernah menerima sinkronisasi' : 'Belum ada sinkronisasi tercatat'}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{settings?.last_sync_at ? `Pembaruan terakhir ${String(settings.last_sync_at).substring(0, 16)}` : 'Status akan diperbarui setelah data pertama berhasil diterima dari Nebula Presence.'}</p>
                        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] font-semibold text-sky-200"><Activity size={13} /> Status berdasarkan catatan terakhir, bukan indikator palsu</div>
                    </div>
                </div>
            </section>

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
