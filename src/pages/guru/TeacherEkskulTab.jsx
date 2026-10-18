import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Calendar, 
    CalendarDays,
    Clock, 
    Plus, 
    Check, 
    CheckCheck,
    CheckCircle2,
    Award, 
    Trophy,
    Target,
    CheckCircle, 
    AlertCircle, 
    Save, 
    MapPin, 
    BarChart3, 
    FileText,
    UserPlus,
    UserX,
    Trash2,
    RefreshCw,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function TeacherEkskulTab({ teacher }) {
    const [ekskuls, setEkskuls] = useState([]);
    const [selectedEkskul, setSelectedEkskul] = useState(null);
    const [activeSection, setActiveSection] = useState('sessions'); // 'sessions' | 'attendance' | 'members' | 'recap'
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Sesi Pertemuan
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionStartTime, setSessionStartTime] = useState('14:00');
    const [sessionEndTime, setSessionEndTime] = useState('16:00');
    const [activityTopic, setActivityTopic] = useState('');
    const [activitySummary, setActivitySummary] = useState('');
    const [savingSession, setSavingSession] = useState(false);

    // Presensi Sesi
    const [sessionAttendance, setSessionAttendance] = useState([]);
    const [savingAttendance, setSavingAttendance] = useState(false);

    // Anggota Ekskul
    const [members, setMembers] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [selectedNewMemberId, setSelectedNewMemberId] = useState('');

    // Rekapitulasi
    const [recapData, setRecapData] = useState([]);

    // Muat ekskul binaan guru
    const fetchMyEkskuls = async () => {
        setLoading(true);
        try {
            const res = await authFetch('/api/extracurriculars/my-ekskul');
            const data = await res.json();
            if (data.success) {
                setEkskuls(data.data || []);
                if (data.data?.length > 0 && !selectedEkskul) {
                    setSelectedEkskul(data.data[0]);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Muat sesi pertemuan untuk ekskul yang dipilih
    const fetchSessions = async (ekskulId) => {
        if (!ekskulId) return;
        try {
            const res = await authFetch(`/api/extracurriculars/${ekskulId}/sessions`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Muat anggota ekskul
    const fetchMembers = async (ekskulId) => {
        if (!ekskulId) return;
        try {
            const res = await authFetch(`/api/extracurriculars/${ekskulId}/members`);
            const data = await res.json();
            if (data.success) {
                setMembers(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Muat presensi sesi tertentu
    const fetchSessionAttendance = async (sessionId) => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const res = await authFetch(`/api/extracurriculars/sessions/${sessionId}/attendance`);
            const data = await res.json();
            if (data.success) {
                setSelectedSession(data.session);
                setSessionAttendance(data.data || []);
                setActiveSection('attendance');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Muat rekapitulasi kehadiran
    const fetchRecap = async (ekskulId) => {
        if (!ekskulId) return;
        try {
            const res = await authFetch(`/api/extracurriculars/${ekskulId}/recap`);
            const data = await res.json();
            if (data.success) {
                setRecapData(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchMyEkskuls();
    }, []);

    useEffect(() => {
        if (selectedEkskul) {
            fetchSessions(selectedEkskul.id);
            fetchMembers(selectedEkskul.id);
            fetchRecap(selectedEkskul.id);
            setSessionStartTime(selectedEkskul.start_time || '14:00');
            setSessionEndTime(selectedEkskul.end_time || '16:00');
        }
    }, [selectedEkskul]);

    // Buka sesi kegiatan baru
    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!activityTopic.trim()) {
            setFeedback({ type: 'error', message: 'Materi topik kegiatan wajib diisi.' });
            return;
        }

        setSavingSession(true);
        setFeedback({ type: '', message: '' });

        try {
            const res = await authFetch(`/api/extracurriculars/${selectedEkskul.id}/sessions`, {
                method: 'POST',
                body: JSON.stringify({
                    sessionDate,
                    startTime: sessionStartTime,
                    endTime: sessionEndTime,
                    activityTopic: activityTopic.trim(),
                    activitySummary: activitySummary.trim()
                })
            });
            const data = await res.json();

            if (data.success) {
                setFeedback({ type: 'success', message: 'Sesi kegiatan berhasil dibuka!' });
                setShowNewSessionModal(false);
                setActivityTopic('');
                setActivitySummary('');
                fetchSessions(selectedEkskul.id);
                // Langsung buka lembar presensi untuk sesi yang baru dibuka
                fetchSessionAttendance(data.sessionId);
            } else {
                setFeedback({ type: 'error', message: data.message || 'Gagal membuat sesi.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Kesalahan sistem saat membuat sesi.' });
        } finally {
            setSavingSession(false);
        }
    };

    // Simpan presensi anggota sesi
    const handleSaveAttendance = async () => {
        if (!selectedSession) return;
        setSavingAttendance(true);
        setFeedback({ type: '', message: '' });

        try {
            const payload = {
                attendances: sessionAttendance.map(s => ({
                    memberId: s.member_id,
                    status: s.status,
                    notes: s.notes
                }))
            };

            const res = await authFetch(`/api/extracurriculars/sessions/${selectedSession.id}/attendance`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setFeedback({ type: 'success', message: 'Presensi sesi ekstrakurikuler berhasil disimpan!' });
                fetchSessions(selectedEkskul.id);
                fetchRecap(selectedEkskul.id);
            } else {
                setFeedback({ type: 'error', message: data.message || 'Gagal menyimpan presensi.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Gagal menghubungi server.' });
        } finally {
            setSavingAttendance(false);
        }
    };

    // Tandai semua anggota Hadir
    const markAllPresent = () => {
        setSessionAttendance(prev => prev.map(m => ({ ...m, status: 'HADIR' })));
    };

    const statusOptions = [
        { label: 'Hadir', value: 'HADIR', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
        { label: 'Terlambat', value: 'TERLAMBAT', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-300' },
        { label: 'Izin', value: 'IZIN', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-300' },
        { label: 'Sakit', value: 'SAKIT', icon: AlertCircle, color: 'bg-purple-50 text-purple-700 border-purple-300' },
        { label: 'Alpa', value: 'ALPA', icon: UserX, color: 'bg-rose-50 text-rose-700 border-rose-300' }
    ];

    if (ekskuls.length === 0 && !loading) {
        return (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Belum Ada Penugasan Ekstrakurikuler</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Anda belum ditunjuk sebagai pembina ekstrakurikuler oleh pihak sekolah. Hubungi admin sekolah jika ada penugasan baru.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Ekstrakurikuler */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600 block">
                        Modul Pembina Ekstrakurikuler
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <Award className="w-6 h-6 text-blue-600" />
                        {selectedEkskul ? selectedEkskul.name : 'Ekstrakurikuler'}
                    </h2>
                    {selectedEkskul && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                {selectedEkskul.day_name} ({selectedEkskul.start_time} - {selectedEkskul.end_time})
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {selectedEkskul.location || 'Area Sekolah'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Pemilih Ekskul jika membina lebih dari satu */}
                {ekskuls.length > 1 && (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500">Pilih Ekskul:</label>
                        <select
                            value={selectedEkskul?.id || ''}
                            onChange={(e) => {
                                const found = ekskuls.find(x => x.id === parseInt(e.target.value));
                                if (found) setSelectedEkskul(found);
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                        >
                            {ekskuls.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                )}
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

            {/* Navigasi Sub-Tab */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveSection('sessions')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        activeSection === 'sessions' 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Calendar className="w-3.5 h-3.5" />
                    Sesi Pertemuan ({sessions.length})
                </button>

                {selectedSession && (
                    <button
                        type="button"
                        onClick={() => setActiveSection('attendance')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            activeSection === 'attendance' 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Check className="w-3.5 h-3.5" />
                        Presensi Sesi ({selectedSession.session_date})
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setActiveSection('members')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        activeSection === 'members' 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    Anggota ({members.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('recap')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        activeSection === 'recap' 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Rekapitulasi Kehadiran
                </button>
            </div>

            {/* SECTION 1: DAFTAR SESI PERTEMUAN */}
            {activeSection === 'sessions' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Jadwal & Riwayat Sesi Kegiatan
                            </h3>
                            <p className="text-xs text-slate-500">
                                Setiap sesi mencatat tanggal aktual latihan, materi kegiatan, dan presensi anggota.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowNewSessionModal(true)}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shadow-xs"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            Buka Sesi Pertemuan Baru
                        </button>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            Belum ada sesi latihan yang dibuat. Klik tombol di atas untuk membuka sesi baru.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {sessions.map((s) => (
                                <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                                                {s.session_date}
                                            </span>
                                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {s.start_time} - {s.end_time}
                                            </span>
                                        </div>
                                        <h4 className="text-base font-bold text-slate-800">
                                            {s.activity_topic}
                                        </h4>
                                        {s.activity_summary && (
                                            <p className="text-xs text-slate-600">
                                                <span className="font-semibold text-slate-700">Ringkasan:</span> {s.activity_summary}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                            {s.count_hadir || 0} / {s.total_attendance || members.length} Hadir
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => fetchSessionAttendance(s.id)}
                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                        >
                                            Presensi Sesi
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL BUKA SESI BARU */}
            {showNewSessionModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Buka Sesi Pertemuan Ekskul
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowNewSessionModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSession} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Pelaksanaan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={sessionDate}
                                        onChange={(e) => setSessionDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Jam Mulai
                                    </label>
                                    <input
                                        type="time"
                                        value={sessionStartTime}
                                        onChange={(e) => setSessionStartTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Jam Selesai
                                    </label>
                                    <input
                                        type="time"
                                        value={sessionEndTime}
                                        onChange={(e) => setSessionEndTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Materi / Agenda Latihan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Latihan Tali-Temali & Pionering"
                                        value={activityTopic}
                                        onChange={(e) => setActivityTopic(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Ringkasan / Catatan Pertemuan
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Contoh: Seluruh regu menyelesaikan menara tepat waktu..."
                                        value={activitySummary}
                                        onChange={(e) => setActivitySummary(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowNewSessionModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSession}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                                >
                                    {savingSession ? 'Menyimpan...' : 'Buka Sesi & Isi Presensi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SECTION 2: PRESENSI SESI AKTIF */}
            {activeSection === 'attendance' && selectedSession && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                            <span className="text-[11px] font-bold text-blue-600 uppercase">
                                Lembar Kehadiran Sesi
                            </span>
                            <h3 className="text-lg font-extrabold text-slate-900">
                                {selectedSession.activity_topic}
                            </h3>
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                <span>Tanggal: {selectedSession.session_date}</span>
                                <span>•</span>
                                <span>{selectedSession.start_time} - {selectedSession.end_time}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={markAllPresent}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                Set Semua Hadir
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveAttendance}
                                disabled={savingAttendance}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                                {savingAttendance ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Simpan Presensi
                            </button>
                        </div>
                    </div>

                    {/* Roster Anggota Sesi */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                        {sessionAttendance.map((m, idx) => (
                            <div key={m.member_id} className="p-3 bg-white hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-6 text-xs font-bold text-slate-400">{idx + 1}.</span>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 truncate">{m.full_name}</div>
                                        <div className="text-[11px] text-slate-400">Kelas: {m.division || '-'}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        {statusOptions.map(opt => {
                                            const isChecked = m.status === opt.value;
                                            const OptIcon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setSessionAttendance(prev => prev.map(x => 
                                                            x.member_id === m.member_id ? { ...x, status: opt.value } : x
                                                        ));
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                                        isChecked 
                                                            ? `${opt.color} font-extrabold shadow-xs ring-1 ring-current` 
                                                            : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <OptIcon className="w-3 h-3 shrink-0" />
                                                    <span>{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Catatan..."
                                        value={m.notes || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSessionAttendance(prev => prev.map(x => 
                                                x.member_id === m.member_id ? { ...x, notes: val } : x
                                            ));
                                        }}
                                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 3: DAFTAR ANGGOTA EKSKUL */}
            {activeSection === 'members' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Anggota Terdaftar ({members.length} Siswa)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Siswa aktif yang mengikuti kegiatan ekstrakurikuler {selectedEkskul?.name}.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {members.map((m, idx) => (
                            <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 truncate">
                                        {m.full_name}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        Kelas: {m.division || '-'} • NISN: {m.nisn || '-'}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                                    Aktif
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 4: REKAPITULASI KEHADIRAN */}
            {activeSection === 'recap' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Rekapitulasi Kehadiran Anggota
                        </h3>
                        <p className="text-xs text-slate-500">
                            Ringkasan persentase kehadiran per siswa untuk laporan nilai ekstrakurikuler rapor.
                        </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">No</th>
                                    <th className="p-3">Nama Siswa</th>
                                    <th className="p-3">Kelas</th>
                                    <th className="p-3 text-center">Hadir</th>
                                    <th className="p-3 text-center">Izin</th>
                                    <th className="p-3 text-center">Sakit</th>
                                    <th className="p-3 text-center">Alpa</th>
                                    <th className="p-3 text-right">Persentase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recapData.map((r, idx) => (
                                    <tr key={r.member_id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="p-3 font-bold text-slate-800">{r.full_name}</td>
                                        <td className="p-3 text-slate-500">{r.division}</td>
                                        <td className="p-3 text-center font-bold text-emerald-600">{r.hadir}</td>
                                        <td className="p-3 text-center font-bold text-blue-600">{r.izin}</td>
                                        <td className="p-3 text-center font-bold text-purple-600">{r.sakit}</td>
                                        <td className="p-3 text-center font-bold text-rose-600">{r.alpa}</td>
                                        <td className="p-3 text-right">
                                            <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                                                r.percentage >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {r.percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
