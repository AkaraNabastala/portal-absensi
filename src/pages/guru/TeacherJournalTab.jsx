import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Calendar, 
    CalendarDays,
    Clock, 
    CheckCircle, 
    CheckCircle2,
    AlertCircle, 
    Save, 
    History, 
    Users, 
    Search, 
    Check, 
    CheckCheck,
    FileText, 
    ChevronRight,
    MapPin,
    GraduationCap,
    RefreshCw,
    UserX,
    BadgeCheck,
    Sparkles,
    Send,
    Edit3
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function TeacherJournalTab({ teacher, schoolInfo }) {
    const [subTab, setSubTab] = useState('input'); // 'input' | 'history'
    const [todaySchedules, setTodaySchedules] = useState([]);
    const [allSchedules, setAllSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // State Formulir Jurnal
    const [topic, setTopic] = useState('');
    const [activities, setActivities] = useState('');
    const [assignments, setAssignments] = useState('');
    const [notes, setNotes] = useState('');
    const [actualStartTime, setActualStartTime] = useState('');
    const [actualEndTime, setActualEndTime] = useState('');
    const [status, setStatus] = useState('SUBMITTED');

    // State Presensi Siswa per Pertemuan
    const [studentsAttendance, setStudentsAttendance] = useState([]);

    // State Riwayat Jurnal
    const [journalHistory, setJournalHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Ambil jadwal hari ini dan jadwal mingguan
    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const [resToday, resAll] = await Promise.all([
                authFetch(`/api/teacher/today-schedules?date=${selectedDate}`),
                authFetch('/api/teacher/schedules')
            ]);
            const dataToday = await resToday.json();
            const dataAll = await resAll.json();

            if (dataToday.success) {
                setTodaySchedules(dataToday.data || []);
                // Pilih jadwal pertama jika belum ada yang dipilih
                if (!selectedSchedule && dataToday.data?.length > 0) {
                    handleSelectSchedule(dataToday.data[0]);
                }
            }
            if (dataAll.success) {
                setAllSchedules(dataAll.data || []);
            }
        } catch (err) {
            console.error('Error fetching schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    // Muat detail jurnal & siswa kelas saat jadwal dipilih
    const handleSelectSchedule = async (sched) => {
        setSelectedSchedule(sched);
        setFeedback({ type: '', message: '' });
        setLoading(true);

        try {
            const res = await authFetch(`/api/teacher/journal/${sched.id}/${selectedDate}`);
            const data = await res.json();

            if (data.success) {
                if (data.journal) {
                    setTopic(data.journal.topic || '');
                    setActivities(data.journal.activities || '');
                    setAssignments(data.journal.assignments || '');
                    setNotes(data.journal.notes || '');
                    setActualStartTime(data.journal.actual_start_time || sched.start_time);
                    setActualEndTime(data.journal.actual_end_time || sched.end_time);
                    setStatus(data.journal.status || 'SUBMITTED');
                } else {
                    // Reset formulir untuk draf baru
                    setTopic('');
                    setActivities('');
                    setAssignments('');
                    setNotes('');
                    setActualStartTime(sched.start_time || '07:30');
                    setActualEndTime(sched.end_time || '09:30');
                    setStatus('SUBMITTED');
                }

                // Format daftar siswa dengan default status HADIR
                const formattedStudents = (data.students || []).map(s => ({
                    memberId: s.member_id,
                    fullName: s.full_name,
                    nisn: s.nisn,
                    division: s.division,
                    status: s.status || 'HADIR',
                    note: s.note || ''
                }));
                setStudentsAttendance(formattedStudents);
            }
        } catch (err) {
            console.error('Error loading schedule journal:', err);
        } finally {
            setLoading(false);
        }
    };

    // Muat riwayat jurnal
    const fetchJournalHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await authFetch('/api/teacher/journals/history');
            const data = await res.json();
            if (data.success) {
                setJournalHistory(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching journal history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [selectedDate]);

    useEffect(() => {
        if (subTab === 'history') {
            fetchJournalHistory();
        }
    }, [subTab]);

    // Tandai semua siswa Hadir
    const markAllPresent = () => {
        setStudentsAttendance(prev => prev.map(s => ({ ...s, status: 'HADIR' })));
    };

    // Perbarui status presensi satu siswa
    const updateStudentStatus = (memberId, newStatus) => {
        setStudentsAttendance(prev => prev.map(s => 
            s.memberId === memberId ? { ...s, status: newStatus } : s
        ));
    };

    // Perbarui catatan satu siswa
    const updateStudentNote = (memberId, note) => {
        setStudentsAttendance(prev => prev.map(s => 
            s.memberId === memberId ? { ...s, note } : s
        ));
    };

    // Simpan jurnal dan presensi
    const handleSaveJournal = async (e) => {
        e.preventDefault();
        if (!selectedSchedule) {
            setFeedback({ type: 'error', message: 'Silakan pilih jadwal mengajar terlebih dahulu.' });
            return;
        }
        if (!topic.trim()) {
            setFeedback({ type: 'error', message: 'Materi / Topik pembelajaran wajib diisi.' });
            return;
        }

        setSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const payload = {
                scheduleId: selectedSchedule.id,
                date: selectedDate,
                topic: topic.trim(),
                activities: activities.trim(),
                assignments: assignments.trim(),
                notes: notes.trim(),
                status,
                actualStartTime,
                actualEndTime,
                attendances: studentsAttendance.map(s => ({
                    memberId: s.memberId,
                    status: s.status,
                    note: s.note
                }))
            };

            const res = await authFetch('/api/teacher/journal', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setFeedback({ type: 'success', message: 'Jurnal mengajar dan presensi kelas berhasil disimpan!' });
                fetchSchedules();
            } else {
                setFeedback({ type: 'error', message: data.message || 'Gagal menyimpan jurnal.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem saat menyimpan.' });
        } finally {
            setSaving(false);
        }
    };

    const statusOptions = [
        { label: 'Hadir', value: 'HADIR', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
        { label: 'Terlambat', value: 'TERLAMBAT', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-300' },
        { label: 'Izin', value: 'IZIN', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-300' },
        { label: 'Sakit', value: 'SAKIT', icon: AlertCircle, color: 'bg-purple-50 text-purple-700 border-purple-300' },
        { label: 'Alpa', value: 'ALPA', icon: UserX, color: 'bg-rose-50 text-rose-700 border-rose-300' },
        { label: 'Dispensasi', value: 'DISPENSASI', icon: BadgeCheck, color: 'bg-cyan-50 text-cyan-700 border-cyan-300' }
    ];

    return (
        <div className="space-y-6">
            {/* Header Tab & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        Jurnal Mengajar & Presensi Kelas
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Catat realisasi materi pembelajaran dan verifikasi kehadiran siswa pada setiap jam pelajaran.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSubTab('input')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            subTab === 'input' 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Isi Jurnal
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('history')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            subTab === 'history' 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Riwayat Jurnal
                    </button>
                </div>
            </div>

            {feedback.message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                    feedback.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    {feedback.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {subTab === 'input' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* SISI KIRI: PEMILIHAN JADWAL MENGAJAR */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                    Pilih Tanggal Pertemuan
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center justify-between">
                                    <span>Jadwal Hari Ini</span>
                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                        {todaySchedules.length} Sesi
                                    </span>
                                </h3>

                                {todaySchedules.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                                        Tidak ada jadwal mengajar pada tanggal ini.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {todaySchedules.map((sched) => {
                                            const isSelected = selectedSchedule?.id === sched.id;
                                            const hasJournal = !!sched.journal_id;

                                            return (
                                                <button
                                                    key={sched.id}
                                                    type="button"
                                                    onClick={() => handleSelectSchedule(sched)}
                                                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="font-bold text-sm text-slate-900 leading-tight">
                                                            {sched.subject_name}
                                                        </span>
                                                        {hasJournal ? (
                                                            <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                                                Tercatat
                                                            </span>
                                                        ) : (
                                                            <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                                                Belum Diisi
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1 font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                                                            <GraduationCap className="w-3.5 h-3.5" />
                                                            {sched.division}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            {sched.start_time} - {sched.end_time}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pilihan Semua Jadwal Mingguan jika ingin isi di luar jadwal */}
                            <div className="pt-3 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                    Atau pilih dari Jadwal Mingguan:
                                </label>
                                <select
                                    onChange={(e) => {
                                        const s = allSchedules.find(x => x.id === parseInt(e.target.value));
                                        if (s) handleSelectSchedule(s);
                                    }}
                                    value={selectedSchedule?.id || ''}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
                                >
                                    <option value="">-- Pilih Jadwal Pelajaran --</option>
                                    {allSchedules.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.day_name} ({s.start_time}-{s.end_time}) - {s.subject_name} - {s.division}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SISI KANAN: FORMULIR MATERI & TABEL PRESENSI SISWA */}
                    <div className="lg:col-span-8 space-y-6">
                        {!selectedSchedule ? (
                            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 flex flex-col items-center justify-center">
                                <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="font-semibold text-sm">Silakan pilih jadwal mengajar di sisi kiri untuk mulai mengisi jurnal.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveJournal} className="space-y-6">
                                {/* Kartu Identitas Pembelajaran */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                        <div>
                                            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600 block">
                                                Jadwal Aktif Terpilih
                                            </span>
                                            <h3 className="text-lg font-extrabold text-slate-900">
                                                {selectedSchedule.subject_name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                                                Kelas: {selectedSchedule.division}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
                                                {selectedSchedule.room || 'Ruang Kelas'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Input Materi & Pelaksanaan */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Materi / Topik Pembelajaran <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Contoh: Pengenalan State Management & Hook di React"
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Jam Mulai Aktual
                                            </label>
                                            <input
                                                type="time"
                                                value={actualStartTime}
                                                onChange={(e) => setActualStartTime(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Jam Selesai Aktual
                                            </label>
                                            <input
                                                type="time"
                                                value={actualEndTime}
                                                onChange={(e) => setActualEndTime(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Aktivitas & Metode Pembelajaran
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="Contoh: Praktikum mandiri di lab, diskusi kelompok studi kasus..."
                                                value={activities}
                                                onChange={(e) => setActivities(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Tugas / Tagihan Siswa
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Modul 3 latihan nomor 1-5"
                                                value={assignments}
                                                onChange={(e) => setAssignments(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Catatan Khusus / Kendala Kelas
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Proyektor ruang 3 bermasalah, dipindah ke lab"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Kartu Presensi Siswa Jam Pelajaran */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-600" />
                                                Presensi Siswa ({studentsAttendance.length} Siswa)
                                            </h4>
                                            <p className="text-[11px] text-slate-500">
                                                Verifikasi kehadiran siswa di ruang kelas untuk jam pelajaran ini.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={markAllPresent}
                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                            Set Semua Hadir
                                        </button>
                                    </div>

                                    {/* Tabel Siswa */}
                                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                                        {studentsAttendance.map((std, idx) => (
                                            <div key={std.memberId} className="p-3 bg-white hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-6 text-xs font-bold text-slate-400">
                                                        {idx + 1}.
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-slate-900 truncate">
                                                            {std.fullName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            NISN: {std.nisn || '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Pil Status dengan Icon */}
                                                    <div className="flex items-center gap-1">
                                                        {statusOptions.map(opt => {
                                                            const isChecked = std.status === opt.value;
                                                            const OptIcon = opt.icon;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => updateStudentStatus(std.memberId, opt.value)}
                                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                                                        isChecked 
                                                                            ? `${opt.color} shadow-xs font-extrabold ring-1 ring-current` 
                                                                            : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    <OptIcon className="w-3 h-3 shrink-0" />
                                                                    <span>{opt.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Input Catatan Singkat */}
                                                    <input
                                                        type="text"
                                                        placeholder="Catatan..."
                                                        value={std.note || ''}
                                                        onChange={(e) => updateStudentNote(std.memberId, e.target.value)}
                                                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tombol Simpan Aksi */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        <span>Simpan Jurnal & Presensi Kelas</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            ) : (
                /* TAB RIWAYAT JURNAL */
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-600" />
                        Riwayat Pertemuan & Jurnal Pembelajaran
                    </h3>

                    {loadingHistory ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Memuat riwayat jurnal...</div>
                    ) : journalHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Belum ada jurnal yang tercatat.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {journalHistory.map((j) => (
                                <div key={j.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-bold text-slate-900 px-2.5 py-0.5 rounded-md bg-slate-100">
                                                {j.date} ({j.day_name})
                                            </span>
                                            <span className="font-bold text-blue-700 px-2.5 py-0.5 rounded-md bg-blue-50">
                                                {j.division}
                                            </span>
                                            <span className="text-slate-500 font-medium">
                                                {j.actual_start_time} - {j.actual_end_time}
                                            </span>
                                        </div>
                                        <h4 className="text-base font-extrabold text-slate-800">
                                            {j.subject_name}: {j.topic}
                                        </h4>
                                        {j.activities && (
                                            <p className="text-xs text-slate-600">
                                                <span className="font-semibold text-slate-700">Aktivitas:</span> {j.activities}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right text-xs">
                                            <span className="text-slate-400 block text-[10px]">Kehadiran Kelas</span>
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                {j.count_hadir} / {j.total_students} Hadir
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDate(j.date);
                                                setSubTab('input');
                                                const sched = allSchedules.find(s => s.id === j.schedule_id) || { id: j.schedule_id, subject_name: j.subject_name, division: j.division };
                                                handleSelectSchedule(sched);
                                            }}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                        >
                                            Buka / Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
