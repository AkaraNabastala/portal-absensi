import React from 'react';
import { Calendar } from 'lucide-react';
import AttendanceDonut from '../../components/AttendanceDonut';

export default function TeacherMonthlyTab({
    logs = [],
    personalStats = {},
    attendancePercentage = 100,
    personalMonths = [],
    selectedPersonalMonth = '',
    onMonthChange,
    formatIndoDate
}) {
    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h3 className="text-base font-bold text-slate-900">Rekapitulasi Bulanan</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-500">Bulan:</label>
                    <select
                        value={selectedPersonalMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                        <option value="">Semua Catatan</option>
                        {personalMonths.map((m) => (
                            <option key={m} value={m}>Periode {m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Donut Chart Rekap Guru */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <AttendanceDonut
                    percentage={attendancePercentage}
                    stats={personalStats}
                    title={`Bulan ${selectedPersonalMonth || 'Semua'}`}
                />
            </div>

            {/* Rincian Log Kehadiran Periode Terpilih */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Rincian Kehadiran Periode {selectedPersonalMonth || 'Semua'}
                </h4>

                {/* Tampilan Mobile Card List */}
                <div className="block sm:hidden space-y-3">
                    {logs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada catatan presensi di periode ini.
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div
                                key={`${log.id || 'log'}-${log.date || idx}-${idx}`}
                                className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="font-bold text-slate-800 text-sm">
                                            {formatIndoDate(log.date)}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                                        log.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                        log.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                        log.status === 'IZIN' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                        log.status === 'SAKIT' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                        'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}>
                                        {log.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/60 font-mono">
                                    <div>
                                        <span>Masuk: </span>
                                        <b className="text-emerald-600 font-bold">{log.time_in || '--:--'}</b>
                                    </div>
                                    <div>
                                        <span>Pulang: </span>
                                        <b className="text-blue-600 font-bold">{log.time_out || '--:--'}</b>
                                    </div>
                                </div>
                                {log.note && (
                                    <p className="text-xs text-slate-500 italic pt-1">{log.note}</p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Tampilan Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="py-3.5 px-4 rounded-l-xl">Tanggal</th>
                                <th className="py-3.5 px-4">Jam Masuk</th>
                                <th className="py-3.5 px-4">Jam Pulang</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 rounded-r-xl">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {logs.map((log, idx) => (
                                <tr key={`${log.id || 'log'}-${log.date || idx}-${idx}`} className="hover:bg-slate-50">
                                    <td className="py-4 px-4 font-bold text-slate-900">{formatIndoDate(log.date)}</td>
                                    <td className="py-4 px-4 font-mono text-emerald-600 font-bold">{log.time_in || '-'}</td>
                                    <td className="py-4 px-4 font-mono text-blue-600 font-bold">{log.time_out || '-'}</td>
                                    <td className="py-4 px-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                                log.status === 'HADIR'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : log.status === 'TERLAMBAT'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : log.status === 'IZIN'
                                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                                    : log.status === 'SAKIT'
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}
                                        >
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-500">{log.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
