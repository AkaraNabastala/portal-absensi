import React from 'react';
import { Calendar, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import AttendanceDonut from '../../components/AttendanceDonut';

export default function StudentOverviewTab({
    student,
    parentData,
    stats,
    attendancePercentage,
    setActiveTab,
    formatIndoDate
}) {
    return (
        <div className="space-y-6">
            {/* Notifikasi Pengajuan Izin Khusus Wali Murid */}
            {parentData?.leaves && parentData.leaves.length > 0 && (() => {
                const latestLeave = parentData.leaves[0];
                const isPending = latestLeave.status === 'MENUNGGU';
                const isApproved = latestLeave.status === 'DISETUJUI';

                const typeLabel = latestLeave.type === 'SAKIT' ? 'Sakit' : latestLeave.type === 'IZIN' ? 'Izin' : 'Dispensasi';

                const bannerStyle = isPending
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : isApproved
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900';

                const badgeStyle = isPending
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : isApproved
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300';

                const icon = isPending ? (
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : isApproved ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                );

                const statusText = isPending
                    ? 'Menunggu konfirmasi & verifikasi dari Wali Kelas'
                    : isApproved
                    ? 'Telah disetujui oleh Wali Kelas'
                    : 'Permohonan ditolak oleh Wali Kelas';

                return (
                    <div className={`p-4 sm:p-5 rounded-2xl border ${bannerStyle} flex items-start gap-3.5 shadow-xs transition-all`}>
                        {icon}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-sm">
                                    Status Pengajuan {typeLabel}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${badgeStyle}`}>
                                    {latestLeave.status}
                                </span>
                                <span className="text-xs text-slate-500 font-mono ml-auto">
                                    {latestLeave.start_date} {latestLeave.end_date && latestLeave.end_date !== latestLeave.start_date ? `s/d ${latestLeave.end_date}` : ''}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium opacity-90">
                                {statusText} {latestLeave.reason ? `— "${latestLeave.reason}"` : ''}
                            </p>
                        </div>
                    </div>
                );
            })()}

            {/* Ringkasan Presensi */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Rekap Kehadiran Bulan Ini</h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                        Kehadiran Siswa
                    </span>
                </div>

                <AttendanceDonut
                    percentage={attendancePercentage}
                    stats={stats}
                    title="Kehadiran"
                />
            </div>

            {/* Aktivitas Presensi Terakhir */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Aktivitas Presensi Terakhir</h3>
                    {setActiveTab && (
                        <button
                            onClick={() => setActiveTab('daily')}
                            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                            <span>Lihat Semua</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {parentData?.logs?.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Belum ada log presensi tercatat.
                        </div>
                    ) : (
                        parentData?.logs?.slice(0, 5).map((log, idx) => (
                            <div
                                key={`${log.id || 'log'}-${log.date || idx}-${idx}`}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/70 border border-slate-100 rounded-2xl gap-3 hover:bg-slate-50 transition"
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

                                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs sm:text-sm pl-13 sm:pl-0">
                                    <div className="font-mono text-slate-600">
                                        <span>Masuk: </span>
                                        <b className="text-emerald-600 font-bold">{log.time_in || '-'}</b>
                                        {log.time_out && (
                                            <span className="text-slate-400 ml-2.5">Pulang: <b className="text-blue-600 font-bold">{log.time_out}</b></span>
                                        )}
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
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
