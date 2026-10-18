import React, { useState, useEffect } from 'react';
import { 
    Award, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    MapPin, 
    User, 
    CheckSquare,
    Users,
    Activity,
    Info
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function StudentEkskulAttendanceTab({ student }) {
    const [loading, setLoading] = useState(true);
    const [joinedEkskuls, setJoinedEkskuls] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [stats, setStats] = useState({ hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
    const [selectedEkskul, setSelectedEkskul] = useState('ALL');

    const loadData = async () => {
        if (!student?.id) return;
        try {
            setLoading(true);
            const res = await authFetch(`/api/student/ekskul-attendance/${student.id}`);
            const data = await res.json();
            if (data.success) {
                setJoinedEkskuls(data.joinedEkskuls || []);
                setAttendances(data.attendances || []);
                setStats(data.stats || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
            }
        } catch (e) {
            console.error('Error fetching ekskul attendance:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [student?.id]);

    const filteredAttendances = attendances.filter(a => {
        return selectedEkskul === 'ALL' || a.extracurricular_name === selectedEkskul;
    });

    const formatIndoDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getStatusBadge = (status) => {
        const s = String(status || '').toUpperCase();
        if (s === 'HADIR') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HADIR</span>;
        }
        if (s === 'TERLAMBAT') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5 text-amber-600" /> TERLAMBAT</span>;
        }
        if (s === 'IZIN') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><CheckSquare className="w-3.5 h-3.5 text-blue-600" /> IZIN</span>;
        }
        if (s === 'SAKIT') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200"><AlertCircle className="w-3.5 h-3.5 text-purple-600" /> SAKIT</span>;
        }
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /> ALPA</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header Ringkasan Kehadiran Ekskul */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                            <Award className="w-3.5 h-3.5 text-purple-600" />
                            Presensi Ekstrakurikuler
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-2">
                            Presensi Sesi Ekstrakurikuler
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Catatan kehadiran latihan dan pertemuan kegiatan ekskul yang dibina oleh dewan guru
                        </p>
                    </div>

                    {/* Ringkasan Skor Metrik */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 shrink-0">
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Hadir</span>
                            <span className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5 block">{stats.hadir}</span>
                        </div>
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                            <span className="text-[10px] font-bold text-amber-600 uppercase block">Telat</span>
                            <span className="text-base sm:text-lg font-black text-amber-700 font-mono mt-0.5 block">{stats.terlambat}</span>
                        </div>
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                            <span className="text-[10px] font-bold text-blue-600 uppercase block">Izin/Skt</span>
                            <span className="text-base sm:text-lg font-black text-blue-700 font-mono mt-0.5 block">{stats.izin + stats.sakit}</span>
                        </div>
                        <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                            <span className="text-[10px] font-bold text-rose-600 uppercase block">Alpa</span>
                            <span className="text-base sm:text-lg font-black text-rose-700 font-mono mt-0.5 block">{stats.alpa}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ekstrakurikuler yang Diikuti */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-sm text-slate-900">Ekstrakurikuler yang Diikuti</h3>
                </div>

                {joinedEkskuls.length === 0 ? (
                    <div className="p-5 bg-slate-50 border border-slate-200/70 rounded-2xl text-center text-slate-400 text-xs">
                        Siswa belum terdaftar di kegiatan ekstrakurikuler manapun.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {joinedEkskuls.map(ekskul => (
                            <div key={ekskul.id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col justify-between hover:border-purple-300 transition">
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700">
                                            {ekskul.day_name || 'Jadwal Rutin'}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {ekskul.start_time} - {ekskul.end_time}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 mt-2.5">{ekskul.name}</h4>
                                    {ekskul.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ekskul.description}</p>
                                    )}
                                </div>
                                <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                                    <span className="truncate flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" /> {ekskul.mentor_full_name || 'Pembina Ekskul'}
                                    </span>
                                    <span className="font-semibold text-purple-600 text-[11px] shrink-0">
                                        {ekskul.total_sessions} Sesi Pertemuan
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Riwayat Presensi Pertemuan Ekskul */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <h3 className="font-bold text-base text-slate-900">
                        Riwayat Presensi Sesi Pertemuan Ekskul
                    </h3>

                    {/* Filter Ekskul */}
                    {joinedEkskuls.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Filter Ekskul:</span>
                            <select
                                value={selectedEkskul}
                                onChange={(e) => setSelectedEkskul(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
                            >
                                <option value="ALL">Semua Ekskul</option>
                                {joinedEkskuls.map(ek => (
                                    <option key={ek.id} value={ek.name}>{ek.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Memuat riwayat presensi ekskul...
                    </div>
                ) : filteredAttendances.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                        <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-700 text-sm">Belum Ada Presensi Sesi Ekskul</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            Presensi akan otomatis tercatat setiap kali pembina ekskul membuka sesi pertemuan dan mencatat kehadiran anggota.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredAttendances.map(item => (
                            <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-900">{item.extracurricular_name}</span>
                                        <span className="text-xs text-slate-400">• {formatIndoDate(item.session_date)}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                                        <span className="text-purple-600 font-bold">Aktivitas:</span>
                                        <span className="text-slate-800 line-clamp-1">{item.activity_topic || 'Latihan Rutin'}</span>
                                    </div>
                                    {item.activity_summary && (
                                        <p className="text-xs text-slate-500 italic line-clamp-1">"{item.activity_summary}"</p>
                                    )}
                                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-400" /> {item.teacher_name || 'Pembina'}
                                        </span>
                                        <span className="flex items-center gap-1 font-mono">
                                            <Clock className="w-3 h-3 text-slate-400" /> {item.start_time || '--:--'} - {item.end_time || '--:--'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                                    {getStatusBadge(item.status)}
                                    {item.notes && (
                                        <span className="text-[11px] text-slate-400 italic">
                                            Catatan: {item.notes}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
