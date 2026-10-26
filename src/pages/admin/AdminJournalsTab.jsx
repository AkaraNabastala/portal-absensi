import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Calendar, 
    Users, 
    CheckCircle, 
    Clock, 
    Search, 
    Filter, 
    GraduationCap,
    Download
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function AdminJournalsTab({ schoolInfo }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [searchDivision, setSearchDivision] = useState('');

    const fetchJournals = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/journals?date=${date}`;
            if (selectedTeacherId) url += `&teacherId=${selectedTeacherId}`;
            if (searchDivision) url += `&division=${encodeURIComponent(searchDivision)}`;

            const res = await authFetch(url);
            const data = await res.json();
            if (data.success) {
                setJournals(data.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const res = await authFetch('/api/admin/teachers');
            const data = await res.json();
            if (data.success) {
                setTeachers(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDivisions = async () => {
        try {
            const res = await authFetch('/api/admin/divisions');
            const data = await res.json();
            if (data.success) setDivisions(data.data || []);
        } catch (err) {
            console.error('Gagal memuat daftar kelas:', err);
        }
    };

    useEffect(() => {
        fetchTeachers();
        fetchDivisions();
    }, []);

    useEffect(() => {
        fetchJournals();
    }, [date, selectedTeacherId, searchDivision]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        Monitoring Jurnal Mengajar Guru
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Pantau pelaksanaan kurikulum, realisasi jam mengajar, dan kehadiran siswa pada setiap rombel.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                        {journals.length} Pertemuan Tercatat
                    </span>
                </div>
            </div>

            {/* Kartu Ringkasan Metrik Monitoring */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jurnal Terisi</div>
                        <div className="text-xl font-black text-slate-900">{journals.length} Sesi</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siswa Terverifikasi Hadir</div>
                        <div className="text-xl font-black text-slate-900">
                            {journals.reduce((acc, j) => acc + (j.count_hadir || 0), 0)} Siswa
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rombel Terlayani</div>
                        <div className="text-xl font-black text-slate-900">
                            {new Set(journals.map(j => j.division)).size} Kelas
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Tanggal Pertemuan
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Guru Pengajar
                    </label>
                    <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                        <option value="">Semua Guru</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Kelas / Rombel
                    </label>
                    <select
                        value={searchDivision}
                        onChange={(e) => setSearchDivision(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                        <option value="">Semua Kelas</option>
                        {divisions.map(division => (
                            <option key={division.id} value={division.name}>{division.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List Jurnal Mengajar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Memuat data monitoring jurnal...</div>
                ) : journals.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada jurnal mengajar yang ditemukan untuk kriteria filter ini.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {journals.map((j) => (
                            <div key={j.id} className="py-4 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                                            {j.division}
                                        </span>
                                        <span className="text-slate-700">
                                            {j.teacher_name} ({j.teacher_nip})
                                        </span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500 font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {j.actual_start_time} - {j.actual_end_time}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                            {j.count_hadir} / {j.total_students} Siswa Hadir
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-base font-extrabold text-slate-900">
                                        {j.subject_name}: <span className="font-semibold text-slate-800">{j.topic}</span>
                                    </h4>
                                    {j.activities && (
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            <span className="font-semibold text-slate-700">Aktivitas:</span> {j.activities}
                                        </p>
                                    )}
                                    {j.assignments && (
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            <span className="font-semibold text-slate-700">Tugas:</span> {j.assignments}
                                        </p>
                                    )}
                                    {j.notes && (
                                        <p className="text-xs text-amber-700 bg-amber-50/70 px-2 py-1 rounded-md mt-1.5 inline-block">
                                            <span className="font-bold">Kendala/Catatan:</span> {j.notes}
                                        </p>
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
