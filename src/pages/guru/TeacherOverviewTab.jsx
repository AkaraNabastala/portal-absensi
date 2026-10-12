import React from 'react';
import { Calendar, ChevronRight, GraduationCap, CheckCircle2 } from 'lucide-react';
import AttendanceDonut from '../../components/AttendanceDonut';

export default function TeacherOverviewTab({
    isWaliKelas,
    currentDivision,
    attendancePercentage,
    personalStats,
    classTodayStats,
    classStudents,
    pendingLeaves,
    personalLogs,
    setActiveTab,
    formatIndoDate
}) {
    return (
        <div className="space-y-6">
            {/* Ringkasan Presensi Pribadi Guru */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Rekap Kehadiran Bulan Ini</h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                        Presensi Pribadi
                    </span>
                </div>

                <AttendanceDonut
                    percentage={attendancePercentage}
                    stats={personalStats}
                    title="Kehadiran"
                />
            </div>

            {/* Sorotan Kelas Binaan (Hanya Tampil Jika Wali Kelas) */}
            {isWaliKelas && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-3xl p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                                    Tanggung Jawab Wali Kelas
                                </span>
                                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                                    Monitoring Kelas {currentDivision}
                                </h3>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    Hari ini: <b className="text-emerald-700">{classTodayStats.hadir}</b> dari {classStudents.length} siswa hadir
                                    {pendingLeaves.length > 0 && (
                                        <span className="ml-2 text-amber-700 font-bold">
                                            • {pendingLeaves.length} izin menunggu verifikasi
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => setActiveTab('class_daily')}
                                className="py-2.5 px-4 bg-white border border-slate-200 hover:border-blue-300 text-slate-800 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                                <span>Laporan Kelas</span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                                onClick={() => setActiveTab('class_leave')}
                                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Kelola Izin</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Riwayat Presensi Guru Terakhir */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Riwayat Presensi</h3>
                    <button
                        onClick={() => setActiveTab('daily')}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                        <span>Lihat Semua</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    {personalLogs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada catatan presensi pribadi.
                        </div>
                    ) : (
                        personalLogs.slice(0, 5).map((log, idx) => (
                            <div
                                key={`${log.id || 'log'}-${log.date || idx}-${idx}`}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-3 hover:bg-slate-100/60 transition"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800 text-sm block">
                                            {formatIndoDate(log.date)}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {log.device_gate || 'Gate Utama'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 text-sm pl-13 sm:pl-0">
                                    <div className="font-mono text-slate-700">
                                        <span>Masuk: </span>
                                        <b className="text-emerald-600">{log.time_in || '-'}</b>
                                        {log.time_out && (
                                            <span className="text-slate-400 ml-3">Pulang: <b className="text-blue-600">{log.time_out}</b></span>
                                        )}
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                            log.status === 'HADIR'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : log.status === 'TERLAMBAT'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : log.status === 'IZIN'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : log.status === 'SAKIT'
                                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}
                                    >
                                        {log.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
