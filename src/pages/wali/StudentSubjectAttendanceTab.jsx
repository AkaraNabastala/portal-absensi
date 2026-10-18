import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    MapPin, 
    User, 
    CheckSquare,
    Search,
    GraduationCap,
    Info
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function StudentSubjectAttendanceTab({ student }) {
    const [loading, setLoading] = useState(true);
    const [attendances, setAttendances] = useState([]);
    const [classSchedules, setClassSchedules] = useState([]);
    const [stats, setStats] = useState({ hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
    const [filterSubject, setFilterSubject] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = async () => {
        if (!student?.id) return;
        try {
            setLoading(true);
            const res = await authFetch(`/api/student/subject-attendance/${student.id}`);
            const data = await res.json();
            if (data.success) {
                setAttendances(data.attendances || []);
                setClassSchedules(data.classSchedules || []);
                setStats(data.stats || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
            }
        } catch (e) {
            console.error('Error fetching subject attendance:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [student?.id]);

    const distinctSubjects = Array.from(new Set([
        ...classSchedules.map(s => s.subject_name),
        ...attendances.map(a => a.subject_name)
    ])).filter(Boolean);

    const filteredAttendances = attendances.filter(a => {
        const matchesSubject = filterSubject === 'ALL' || a.subject_name === filterSubject;
        const matchesQuery = !searchQuery || 
            (a.subject_name && a.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.topic && a.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.teacher_name && a.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSubject && matchesQuery;
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
            {/* Header Ringkasan Kehadiran Mapel */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            Presensi Pembelajaran Kelas {student?.division}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-2">
                            Presensi Mata Pelajaran
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Catatan kehadiran siswa yang diisi langsung oleh dewan guru saat jam pelajaran berlangsung
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

            {/* Jadwal Pelajaran Mingguan Kelas Siswa */}
            {classSchedules.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-sm text-slate-900">Jadwal Pelajaran Kelas {student?.division}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classSchedules.map(sch => (
                            <div key={sch.id} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col justify-between hover:border-blue-300 transition">
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700">
                                            {sch.day_name}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {sch.start_time} - {sch.end_time}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{sch.subject_name}</h4>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                                    <span className="truncate flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" /> {sch.teacher_name}
                                    </span>
                                    <span className="font-mono text-slate-400 shrink-0">{sch.room}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Riwayat Presensi Masuk Pembelajaran */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <h3 className="font-bold text-base text-slate-900">
                        Riwayat Pertemuan & Presensi Mata Pelajaran
                    </h3>

                    {/* Filter Mapel & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value="ALL">Semua Mata Pelajaran</option>
                            {distinctSubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>

                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari materi / guru..."
                                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 w-full sm:w-48 font-medium"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Memuat riwayat presensi pembelajaran...
                    </div>
                ) : filteredAttendances.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                        <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-700 text-sm">Belum Ada Presensi Jam Pelajaran</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            Presensi akan otomatis muncul di sini setiap kali guru pengampu mengisi jurnal mengajar dan mencatat kehadiran kelas.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredAttendances.map(item => (
                            <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-900">{item.subject_name}</span>
                                        <span className="text-xs text-slate-400">• {formatIndoDate(item.date)}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                                        <span className="text-blue-600 font-bold">Materi:</span>
                                        <span className="text-slate-800 line-clamp-1">{item.topic || 'Pembelajaran Reguler'}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-400" /> {item.teacher_name}
                                        </span>
                                        <span className="flex items-center gap-1 font-mono">
                                            <Clock className="w-3 h-3 text-slate-400" /> {item.actual_start_time || '--:--'} - {item.actual_end_time || '--:--'}
                                        </span>
                                        {item.room && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" /> {item.room}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                                    {getStatusBadge(item.status)}
                                    {item.note && (
                                        <span className="text-[11px] text-slate-400 italic">
                                            Catatan: {item.note}
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
