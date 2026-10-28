import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarDays, Clock3, Search, Users, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { authFetch } from '../../utils/api';

export default function TeacherSubjectAttendanceTab() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const response = await authFetch('/api/teacher/journals/history?limit=100');
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Rekap presensi mapel gagal dimuat.');
            setRows(result.data || []);
        } catch (error) {
            toast.error(error.message || 'Gagal memuat presensi mata pelajaran.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => rows.filter((row) => {
        const text = [row.subject_name, row.division, row.topic, row.date].join(' ').toLowerCase();
        return text.includes(query.toLowerCase());
    }), [rows, query]);

    const totalRecorded = rows.reduce((sum, row) => sum + Number(row.total_students || 0), 0);
    const totalPresent = rows.reduce((sum, row) => sum + Number(row.count_hadir || 0), 0);

    return (
        <section className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-100 text-xs font-bold uppercase tracking-wider"><BookOpenCheck className="w-4 h-4" /> Pembelajaran</div>
                        <h2 className="text-2xl font-black mt-2">Presensi Mata Pelajaran</h2>
                        <p className="text-sm text-indigo-100 mt-1">Rekap kehadiran per pertemuan yang dicatat melalui jurnal mengajar.</p>
                    </div>
                    <button onClick={load} disabled={loading} aria-label="Muat ulang presensi mapel" className="rounded-xl bg-white/15 hover:bg-white/25 p-3 disabled:opacity-50"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5 max-w-md">
                    <div className="rounded-xl bg-white/15 p-3"><span className="text-xs text-indigo-100">Pertemuan tercatat</span><b className="block text-2xl mt-1">{rows.length}</b></div>
                    <div className="rounded-xl bg-white/15 p-3"><span className="text-xs text-indigo-100">Hadir dari data presensi</span><b className="block text-2xl mt-1">{totalPresent}/{totalRecorded}</b></div>
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari mata pelajaran, kelas, materi, tanggal…" className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm outline-none focus:border-indigo-500" />
                </div>
            </div>
            {loading ? <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">Memuat rekap presensi…</div> :
                filtered.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <BookOpenCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-800">Belum ada rekap presensi mapel</h3>
                        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2">Rekap akan muncul setelah guru memilih jadwal, mengisi jurnal, lalu menyimpan presensi siswa pada pertemuan tersebut.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((row) => {
                            const count = Number(row.total_students || 0);
                            const present = Number(row.count_hadir || 0);
                            const pct = count ? Math.round((present / count) * 100) : 0;
                            return <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1">{row.date || '-'}</span><span className="text-xs text-slate-500">{row.day_name || ''}</span></div>
                                        <h3 className="text-base font-black text-slate-900 mt-2">{row.subject_name || 'Mata pelajaran'}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{row.division || '-'} · {row.topic || 'Materi belum diisi'}</p>
                                    </div>
                                    <div className="text-sm font-bold text-indigo-700">{pct}% hadir</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Dicatat</span><b className="block text-lg text-slate-900 mt-1">{count}</b></div>
                                    <div className="rounded-xl bg-emerald-50 p-3"><span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Hadir</span><b className="block text-lg text-emerald-800 mt-1">{present}</b></div>
                                    <div className="rounded-xl bg-rose-50 p-3"><span className="text-xs text-rose-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Tidak hadir</span><b className="block text-lg text-rose-800 mt-1">{Number(row.count_absen || 0)}</b></div>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>
                            </article>;
                        })}
                    </div>
                )}
        </section>
    );
}
