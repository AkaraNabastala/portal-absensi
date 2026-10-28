import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, BookOpen, GraduationCap, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { authFetch } from '../../utils/api';

export default function TeacherScheduleTab() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const response = await authFetch('/api/teacher/schedules');
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Jadwal gagal dimuat.');
            setSchedules(result.data || []);
        } catch (error) {
            toast.error(error.message || 'Gagal memuat jadwal mengajar.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const ordered = [...schedules].sort((a, b) => {
        const day = days.indexOf(a.day_name) - days.indexOf(b.day_name);
        return day || String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });

    return (
        <section className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wider"><CalendarDays className="w-4 h-4" /> Akademik Guru</div>
                        <h2 className="text-2xl font-black mt-2">Jadwal Mengajar</h2>
                        <p className="text-sm text-blue-100 mt-1">Daftar jadwal berdasarkan hari, mata pelajaran, kelas, dan waktu mengajar.</p>
                    </div>
                    <button onClick={load} disabled={loading} aria-label="Muat ulang jadwal" className="rounded-xl bg-white/15 hover:bg-white/25 p-3 disabled:opacity-50"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
                <div className="mt-5 inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">{schedules.length} sesi terdaftar</div>
            </div>
            {loading ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">Memuat jadwal…</div> :
                ordered.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-800">Jadwal belum tersedia</h3>
                        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2">Belum ada jadwal yang terhubung ke akun ini. Administrator perlu memastikan assignment guru, kelas, mata pelajaran, dan hasil sinkronisasi Nebula.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {ordered.map((item) => (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 transition">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{item.day_name || 'Hari belum ditentukan'}</span>
                                        <h3 className="text-base font-black text-slate-900 mt-3">{item.subject_name || 'Mata pelajaran belum terhubung'}</h3>
                                        <p className="text-sm text-slate-500 mt-1">{item.academic_year || 'Tahun ajaran belum diatur'}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 text-slate-500"><BookOpen className="w-5 h-5" /></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-sm">
                                    <span className="inline-flex items-center gap-2 text-slate-600"><GraduationCap className="w-4 h-4 text-blue-500" /> Kelas: <b className="text-slate-900">{item.division || '-'}</b></span>
                                    <span className="inline-flex items-center gap-2 text-slate-600"><Clock3 className="w-4 h-4 text-blue-500" /> <b className="text-slate-900">{item.start_time || '--:--'}–{item.end_time || '--:--'}</b></span>
                                    <span className="inline-flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-blue-500" /> Ruang: <b className="text-slate-900">{item.room || '-'}</b></span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
        </section>
    );
}
