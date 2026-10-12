import React from 'react';
import { Calendar, CheckCircle2, Clock, AlertCircle, FileText, XCircle } from 'lucide-react';

export default function StudentDailyTab({
    logs = [],
    stats = {},
    availableMonths = [],
    currentMonth = '',
    onMonthChange,
    formatIndoDate
}) {
    return (
        <div className="space-y-6">
            {/* Filter Periode Bulan & Ringkasan */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h3 className="text-base font-bold text-slate-900">Riwayat Presensi</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-slate-500 font-bold">Bulan:</label>
                    <select
                        value={currentMonth}
                        onChange={onMonthChange}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                        {availableMonths.length > 0 ? (
                            availableMonths.map((m) => (
                                <option key={m} value={m}>
                                    Periode {m}
                                </option>
                            ))
                        ) : (
                            <option value="">Bulan Ini</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Metrik Presensi */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-emerald-700 block">Hadir</span>
                        <span className="text-xl font-black text-emerald-900">{stats.hadir || 0}</span>
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-amber-700 block">Terlambat</span>
                        <span className="text-xl font-black text-amber-900">{stats.terlambat || 0}</span>
                    </div>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-sky-700 block">Izin</span>
                        <span className="text-xl font-black text-sky-900">{stats.izin || 0}</span>
                    </div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-purple-700 block">Sakit</span>
                        <span className="text-xl font-black text-purple-900">{stats.sakit || 0}</span>
                    </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-rose-700 block">Alpa</span>
                        <span className="text-xl font-black text-rose-900">{stats.alpa || 0}</span>
                    </div>
                </div>
            </div>

            {/* Daftar Presensi Harian */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Catatan Kehadiran</h3>
                    <span className="text-xs sm:text-sm font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 self-start sm:self-auto">
                        Total {logs.length} Hari
                    </span>
                </div>

                {/* Tampilan Mobile Card List */}
                <div className="block sm:hidden space-y-3">
                    {logs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada catatan presensi.
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div
                                key={`${log.id || 'log'}-${log.date || idx}-${idx}`}
                                className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2 hover:bg-slate-50 transition"
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
                                    <div className="text-slate-400 font-sans">
                                        {log.device_gate || 'Gate Utama'}
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
                                <th className="py-3.5 px-4">Pintu / Gate</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 rounded-r-xl">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-400">
                                        Belum ada catatan presensi.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => (
                                    <tr key={`${log.id || 'log'}-${log.date || idx}-${idx}`} className="hover:bg-slate-50 transition">
                                        <td className="py-4 px-4 font-bold text-slate-900">
                                            {formatIndoDate(log.date)}
                                        </td>
                                        <td className="py-4 px-4 font-mono text-emerald-600 font-bold">
                                            {log.time_in || '-'}
                                        </td>
                                        <td className="py-4 px-4 font-mono text-blue-600 font-bold">
                                            {log.time_out || '-'}
                                        </td>
                                        <td className="py-4 px-4 text-slate-600">
                                            {log.device_gate || '-'}
                                        </td>
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
                                        <td className="py-4 px-4 text-slate-500 truncate max-w-xs">
                                            {log.note || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
