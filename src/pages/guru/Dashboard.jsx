import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    GraduationCap
} from 'lucide-react';

import TeacherOverviewTab from './TeacherOverviewTab';
import TeacherDailyTab from './TeacherDailyTab';
import TeacherLeaveTab from './TeacherLeaveTab';
import TeacherProfileTab from './TeacherProfileTab';

import ClassDailyTab from './ClassDailyTab';
import ClassMonthlyTab from './ClassMonthlyTab';
import ClassLeaveTab from './ClassLeaveTab';
import ClassStudentsTab from './ClassStudentsTab';
import TeacherJournalTab from './TeacherJournalTab';
import TeacherScheduleTab from './TeacherScheduleTab';
import TeacherSubjectAttendanceTab from './TeacherSubjectAttendanceTab';
import TeacherEkskulTab from './TeacherEkskulTab';

export default function GuruDashboard({ 
    teacher, 
    personalData, 
    teacherSummary, 
    activeTab, 
    setActiveTab, 
    onRefreshPersonal, 
    onRefreshClass, 
    schoolInfo 
}) {
    const isWaliKelas = !!teacher?.is_wali_kelas;
    const canManageClass = (isWaliKelas || !!teacher?.is_penanggung_jawab) && !!(teacher?.assigned_division || teacher?.managed_divisions?.length);
    const currentDivision = teacher?.assigned_division || teacher?.managed_divisions?.[0] || '';
    const [absenceStart, setAbsenceStart] = useState(new Date().toISOString().split('T')[0]);
    const [absenceEnd, setAbsenceEnd] = useState(new Date().toISOString().split('T')[0]);
    const [absenceReason, setAbsenceReason] = useState('');
    const [absenceRows, setAbsenceRows] = useState([]);
    const [absenceTeachers, setAbsenceTeachers] = useState([]);
    const [selectedSubstitutes, setSelectedSubstitutes] = useState({});
    const [absenceMessage, setAbsenceMessage] = useState('');
    const [absenceBusy, setAbsenceBusy] = useState(false);

    const loadTeacherAbsences = async () => {
        try {
            const res = await authFetch('/api/teacher/absence-requests');
            const data = await res.json();
            if (data.success) setAbsenceRows(data.data || []);
            if (teacher?.is_penanggung_jawab) {
                const teachersRes = await authFetch('/api/teacher/active-list');
                const teachersData = await teachersRes.json();
                if (teachersData.success) setAbsenceTeachers(teachersData.data || []);
            }
        } catch {
            setAbsenceMessage('Gagal memuat pengajuan izin.');
        }
    };

    useEffect(() => {
        if (activeTab === 'teacher_absence') loadTeacherAbsences();
    }, [activeTab]);

    const assignSubstitute = async (requestId) => {
        const substituteTeacherId = Number(selectedSubstitutes[requestId]);
        if (!substituteTeacherId) { setAbsenceMessage('Pilih guru pengganti terlebih dahulu.'); return; }
        setAbsenceBusy(true);
        setAbsenceMessage('Menyimpan penugasan pengganti…');
        try {
            const res = await authFetch(`/api/admin/absence-requests/${requestId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ substituteTeacherId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menetapkan pengganti.');
            setAbsenceMessage(data.message || 'Guru pengganti berhasil ditetapkan.');
            await loadTeacherAbsences();
        } catch (error) {
            setAbsenceMessage(error.message || 'Gagal menetapkan pengganti.');
        } finally { setAbsenceBusy(false); }
    };

    const submitTeacherAbsence = async (event) => {
        event.preventDefault();
        setAbsenceBusy(true);
        setAbsenceMessage('');
        try {
            const res = await authFetch('/api/teacher/absence-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: absenceStart, endDate: absenceEnd, reason: absenceReason })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Pengajuan izin gagal.');
            setAbsenceMessage(data.message || 'Pengajuan izin terkirim.');
            setAbsenceReason('');
            await loadTeacherAbsences();
        } catch (error) {
            setAbsenceMessage(error.message || 'Gagal mengirim pengajuan izin.');
        } finally {
            setAbsenceBusy(false);
        }
    };

    // ==========================================
    // 1. STATE & DATA PRESENSI PRIBADI GURU
    // ==========================================
    const todayLog = personalData?.todayLog;
    const personalStats = personalData?.stats || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 };
    const attendancePercentage = personalData?.attendancePercentage ?? 100;
    const personalMonths = personalData?.availableMonths || [];
    const [selectedPersonalMonth, setSelectedPersonalMonth] = useState('');

    // ==========================================
    // 2. STATE & DATA KELAS BINAAN (WALI KELAS)
    // ==========================================
    const classStudents = teacherSummary?.students || [];
    const classTodayStats = teacherSummary?.todayStats || {
        hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, belumScan: 0, percentage: 0
    };

    // Input Izin Siswa oleh Wali Kelas
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [studentLeaveType, setStudentLeaveType] = useState('SAKIT');
    const [studentLeaveStart, setStudentLeaveStart] = useState(new Date().toISOString().split('T')[0]);
    const [studentLeaveEnd, setStudentLeaveEnd] = useState(new Date().toISOString().split('T')[0]);
    const [studentLeaveReason, setStudentLeaveReason] = useState('');
    const [inputStudentLoading, setInputStudentLoading] = useState(false);

    // Permohonan Izin dari Siswa / Orang Tua
    const [classLeaves, setClassLeaves] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [classFilterDate, setClassFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [classDailyStudents, setClassDailyStudents] = useState([]);
    const [classFilterBulan, setClassFilterBulan] = useState(new Date().getMonth() + 1);
    const [classFilterTahun, setClassFilterTahun] = useState(new Date().getFullYear());
    const [classSortConfig, setClassSortConfig] = useState({ key: 'full_name', direction: 'asc' });

    const fetchClassLeaves = async () => {
        if (!currentDivision) return;
        try {
            const res = await authFetch(`/api/teacher/leave-requests/${encodeURIComponent(currentDivision)}`);
            const data = await res.json();
            if (data.success) setClassLeaves(data.leaves);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchClassDailyByDate = async (dt) => {
        if (!currentDivision) return;
        try {
            const res = await authFetch(`/api/teacher/class-attendance/${encodeURIComponent(currentDivision)}?date=${dt}`);
            const data = await res.json();
            if (data.success) setClassDailyStudents(data.students);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isWaliKelas && currentDivision) {
            fetchClassLeaves();
            fetchClassDailyByDate(classFilterDate);

            // Auto-refresh data kehadiran murid kelas binaan setiap 10 detik
            const interval = setInterval(() => {
                fetchClassLeaves();
                fetchClassDailyByDate(classFilterDate);
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [isWaliKelas, currentDivision, classFilterDate]);

    const handleTeacherCreateStudentLeave = async (e) => {
        e.preventDefault();
        if (!selectedStudentId) {
            setFeedbackMsg('Pilih siswa terlebih dahulu.');
            return;
        }
        setFeedbackMsg('');
        setInputStudentLoading(true);
        try {
            const res = await authFetch('/api/teacher/create-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudentId,
                    type: studentLeaveType,
                    startDate: studentLeaveStart,
                    endDate: studentLeaveEnd,
                    reason: studentLeaveReason
                })
            });
            const data = await res.json();
            if (data.success) {
                setFeedbackMsg(data.message || 'Izin siswa berhasil dicatat.');
                setStudentLeaveReason('');
                setSelectedStudentId('');
                fetchClassLeaves();
                const ym = `${classFilterTahun}-${String(classFilterBulan).padStart(2, '0')}`;
                if (onRefreshClass) onRefreshClass(ym);
            } else {
                setFeedbackMsg(data.message || 'Gagal menyimpan izin.');
            }
        } catch {
            setFeedbackMsg('Gagal menghubungi server.');
        } finally {
            setInputStudentLoading(false);
        }
    };

    const handleActionLeave = async (id, action) => {
        setActionLoading(id);
        setFeedbackMsg('');
        try {
            const res = await authFetch(`/api/teacher/leave-requests/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                setFeedbackMsg(`Permohonan telah ${action.toLowerCase()}.`);
                fetchClassLeaves();
                const ym = `${classFilterTahun}-${String(classFilterBulan).padStart(2, '0')}`;
                if (onRefreshClass) onRefreshClass(ym);
            } else {
                setFeedbackMsg(data.message || 'Gagal memproses permohonan.');
            }
        } catch {
            setFeedbackMsg('Gagal menghubungi server.');
        } finally {
            setActionLoading(null);
        }
    };

    const pendingLeaves = classLeaves.filter(l => l.status === 'MENUNGGU');

    const formatIndoDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const teacherTitle = teacher?.is_penanggung_jawab ? 'Penanggung Jawab' : (String(teacher?.role || '').toLowerCase() === 'tendik' ? 'Tenaga Kependidikan' : 'Dewan Guru');

    const handleClassSort = (key) => {
        let direction = 'asc';
        if (classSortConfig.key === key && classSortConfig.direction === 'asc') direction = 'desc';
        setClassSortConfig({ key, direction });
    };

    const sortedClassStudents = [...classStudents].sort((a, b) => {
        let valA = a[classSortConfig.key] || "";
        let valB = b[classSortConfig.key] || "";
        if (classSortConfig.key === 'id') {
            valA = a.nisn || a.nipd || "";
            valB = b.nisn || b.nipd || "";
        }
        if (valA < valB) return classSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return classSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleClassMonthYearChange = (newBulan, newTahun) => {
        setClassFilterBulan(newBulan);
        setClassFilterTahun(newTahun);
        const ym = `${newTahun}-${String(newBulan).padStart(2, '0')}`;
        if (onRefreshClass) onRefreshClass(ym);
    };

    return (
        <div className="space-y-6">
            {/* Header Mobile */}
            <div className="block md:hidden -mx-4 -mt-4 mb-4">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white pt-5 pb-10 px-5 rounded-b-[2rem] shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">
                                {teacher.full_name}
                            </h2>
                            <p className="text-xs text-blue-100 font-medium mt-1">
                                NIP : <span className="font-mono font-bold text-white">{teacher.nip || '-'}</span>
                            </p>
                            <p className="text-xs text-blue-100 font-medium mt-0.5">
                                {teacherTitle} {isWaliKelas && `• Wali Kelas ${currentDivision}`}
                            </p>
                        </div>
                        <div className="w-[60px] h-[80px] rounded-xl overflow-hidden border-2 border-white/80 shadow-md bg-white/20 shrink-0 relative flex items-center justify-center">
                            <span className="text-white font-black text-xl select-none">
                                {teacher.full_name?.charAt(0) || 'G'}
                            </span>
                            {teacher.photo_url && (
                                <img
                                    src={teacher.photo_url}
                                    alt={teacher.full_name}
                                    className="absolute inset-0 w-full h-full object-cover object-center bg-white"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating Card: Status Hari Ini */}
                <div className="-mt-6 mx-4 bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-slate-100 relative z-10 flex items-center justify-between">
                    <div>
                        <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
                            Presensi Hari Ini
                        </span>
                        <div className="mt-1">
                            {todayLog?.status === 'HADIR' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HADIR
                                </span>
                            ) : todayLog?.status === 'TERLAMBAT' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> TERLAMBAT
                                </span>
                            ) : todayLog?.status ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> {todayLog.status}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                    BELUM SCAN
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right border-l border-slate-100 pl-4">
                        <span className="text-xs text-slate-400 font-bold block">Jam Masuk</span>
                        <span className="text-sm font-mono font-black text-slate-900 mt-0.5 block">
                            {todayLog?.time_in || '--:--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Header Desktop */}
            <div className="hidden md:flex justify-between items-center bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-5">
                    <div className="w-21 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-blue-50 shrink-0 relative flex items-center justify-center">
                        <span className="text-blue-600 font-black text-3xl select-none">
                            {teacher.full_name?.charAt(0) || 'G'}
                        </span>
                        {teacher.photo_url && (
                            <img
                                src={teacher.photo_url}
                                alt={teacher.full_name}
                                className="absolute inset-0 w-full h-full object-cover object-center bg-white"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {teacherTitle}
                            </span>
                            {isWaliKelas && (
                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Wali Kelas {currentDivision}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 truncate">
                            {teacher.full_name}
                        </h2>
                        <p className="text-sm font-medium text-slate-600 mt-1">
                            NIP: <span className="font-mono font-bold text-slate-800">{teacher.nip || '-'}</span>
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-6 py-4 flex items-center gap-8">
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                            Status Hari Ini
                        </span>
                        <div className="text-base font-black mt-1">
                            {todayLog?.status === 'HADIR' ? (
                                <span className="text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> HADIR
                                </span>
                            ) : todayLog?.status === 'TERLAMBAT' ? (
                                <span className="text-amber-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> TERLAMBAT
                                </span>
                            ) : todayLog?.status ? (
                                <span className="text-blue-600 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {todayLog.status}
                                </span>
                            ) : (
                                <span className="text-slate-500 flex items-center gap-2">
                                    BELUM SCAN
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="border-l border-slate-200 pl-6 text-right">
                        <span className="text-xs text-slate-400 font-bold block">Jam Masuk</span>
                        <span className="text-base font-mono font-black text-slate-800">
                            {todayLog?.time_in || '--:--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pesan Notifikasi Feedback */}
            {feedbackMsg && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                        <span className="font-semibold">{feedbackMsg}</span>
                    </div>
                    <button onClick={() => setFeedbackMsg('')} className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">
                        &times;
                    </button>
                </div>
            )}

            {/* TAB CONTENT ROUTING */}
            {activeTab === 'overview' && (
                <TeacherOverviewTab
                    isWaliKelas={isWaliKelas}
                    currentDivision={currentDivision}
                    attendancePercentage={attendancePercentage}
                    personalStats={personalStats}
                    classTodayStats={classTodayStats}
                    classStudents={classStudents}
                    pendingLeaves={pendingLeaves}
                    personalLogs={personalData?.logs || []}
                    setActiveTab={setActiveTab}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'daily' && (
                <TeacherDailyTab
                    logs={personalData?.logs || []}
                    personalStats={personalStats}
                    personalMonths={personalMonths}
                    selectedPersonalMonth={selectedPersonalMonth}
                    onMonthChange={(m) => {
                        setSelectedPersonalMonth(m);
                        if (onRefreshPersonal) onRefreshPersonal(m);
                    }}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'leave' && (
                <TeacherLeaveTab
                    teacherId={teacher.id}
                    leaves={personalData?.leaves || []}
                    onRefreshLeave={() => onRefreshPersonal && onRefreshPersonal(selectedPersonalMonth)}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'profile' && (
                <TeacherProfileTab
                    teacher={teacher}
                    personalData={personalData}
                    isWaliKelas={isWaliKelas}
                    currentDivision={currentDivision}
                    teacherTitle={teacherTitle}
                />
            )}

            {activeTab === 'teacher_journal' && (
                <TeacherJournalTab
                    teacher={teacher}
                    schoolInfo={schoolInfo}
                />
            )}

            {activeTab === 'teacher_schedule' && <TeacherScheduleTab />}

            {activeTab === 'teacher_subject_attendance' && <TeacherSubjectAttendanceTab />}

            {activeTab === 'teacher_absence' && (
                <section className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-slate-900">{teacher?.is_penanggung_jawab ? 'Izin & Guru Pengganti' : 'Izin Mengajar'}</h2>
                        <p className="mt-1 text-sm text-slate-500">Admin akan menetapkan guru pengganti untuk jadwal Anda.</p>
                        {absenceMessage && <div role="status" className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{absenceMessage}</div>}
                        <form onSubmit={submitTeacherAbsence} className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">Mulai
                                <input type="date" required value={absenceStart} onChange={e => setAbsenceStart(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
                            </label>
                            <label className="text-sm font-medium text-slate-700">Sampai
                                <input type="date" required min={absenceStart} value={absenceEnd} onChange={e => setAbsenceEnd(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
                            </label>
                            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Alasan
                                <textarea required maxLength={500} value={absenceReason} onChange={e => setAbsenceReason(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" rows={3} placeholder="Sakit, keperluan keluarga, dan sebagainya" />
                            </label>
                            <button disabled={absenceBusy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{absenceBusy ? 'Mengirim...' : 'Ajukan Izin'}</button>
                        </form>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="font-bold text-slate-900">Riwayat Pengajuan</h3>
                        <div className="mt-3 space-y-2">
                            {absenceRows.length === 0 ? <p className="text-sm text-slate-500">Belum ada pengajuan.</p> : absenceRows.map(row => (
                                <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                    <div><p className="text-sm font-semibold text-slate-800">{row.start_date} – {row.end_date}</p><p className="text-xs text-slate-500">{row.reason}</p>{row.substitute_name && <p className="mt-1 text-xs text-emerald-700">Pengganti: {row.substitute_name}</p>}</div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'DISETUJUI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span>
                                    {teacher?.is_penanggung_jawab && row.status !== 'DISETUJUI' && (
                                        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
                                            <select value={selectedSubstitutes[row.id] || ''} onChange={e => setSelectedSubstitutes(prev => ({ ...prev, [row.id]: e.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                                                <option value="">Pilih guru pengganti</option>
                                                {absenceTeachers.filter(item => Number(item.id) !== Number(row.teacher_id)).map(item => <option key={item.id} value={item.id}>{item.full_name} · {item.nip}</option>)}
                                            </select>
                                            <button type="button" disabled={absenceBusy} onClick={() => assignSubstitute(row.id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{absenceBusy ? 'Menyimpan…' : 'Tetapkan Pengganti'}</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'teacher_ekskul' && (
                <TeacherEkskulTab
                    teacher={teacher}
                    schoolInfo={schoolInfo}
                />
            )}

            {activeTab === 'class_daily' && canManageClass && (
                <ClassDailyTab
                    currentDivision={currentDivision}
                    classFilterDate={classFilterDate}
                    setClassFilterDate={setClassFilterDate}
                    students={classDailyStudents}
                    setSelectedStudentId={setSelectedStudentId}
                    setActiveTab={setActiveTab}
                />
            )}

            {activeTab === 'class_monthly' && canManageClass && (
                <ClassMonthlyTab
                    currentDivision={currentDivision}
                    classFilterBulan={classFilterBulan}
                    classFilterTahun={classFilterTahun}
                    handleClassMonthYearChange={handleClassMonthYearChange}
                    classStudents={classStudents}
                    sortedClassStudents={sortedClassStudents}
                    classSortConfig={classSortConfig}
                    handleClassSort={handleClassSort}
                />
            )}

            {activeTab === 'class_leave' && canManageClass && (
                <ClassLeaveTab
                    currentDivision={currentDivision}
                    classStudents={classStudents}
                    selectedStudentId={selectedStudentId}
                    setSelectedStudentId={setSelectedStudentId}
                    studentLeaveType={studentLeaveType}
                    setStudentLeaveType={setStudentLeaveType}
                    studentLeaveStart={studentLeaveStart}
                    setStudentLeaveStart={setStudentLeaveStart}
                    studentLeaveEnd={studentLeaveEnd}
                    setStudentLeaveEnd={setStudentLeaveEnd}
                    studentLeaveReason={studentLeaveReason}
                    setStudentLeaveReason={setStudentLeaveReason}
                    inputStudentLoading={inputStudentLoading}
                    handleTeacherCreateStudentLeave={handleTeacherCreateStudentLeave}
                    pendingLeaves={pendingLeaves}
                    classLeaves={classLeaves}
                    actionLoading={actionLoading}
                    handleActionLeave={handleActionLeave}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'class_students' && canManageClass && (
                <ClassStudentsTab
                    currentDivision={currentDivision}
                    classStudents={classStudents}
                />
            )}
        </div>
    );
}
