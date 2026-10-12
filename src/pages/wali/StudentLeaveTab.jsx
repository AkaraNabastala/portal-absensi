import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export default function StudentLeaveTab({
    studentId,
    leaves = [],
    onRefreshLeave
}) {
    const [leaveType, setLeaveType] = useState('SAKIT');
    const [leaveStart, setLeaveStart] = useState(new Date().toISOString().split('T')[0]);
    const [leaveEnd, setLeaveEnd] = useState(new Date().toISOString().split('T')[0]);
    const [leaveReason, setLeaveReason] = useState('');
    const [leaveMsg, setLeaveMsg] = useState('');
    const [leaveLoading, setLeaveLoading] = useState(false);

    const handleSendLeave = async (e) => {
        e.preventDefault();
        setLeaveMsg('');
        setLeaveLoading(true);
        try {
            const res = await fetch('/api/parent/submit-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    type: leaveType,
                    startDate: leaveStart,
                    endDate: leaveEnd,
                    reason: leaveReason
                })
            });
            const data = await res.json();
            if (data.success) {
                setLeaveMsg('Permohonan izin berhasil dikirim ke Wali Kelas.');
                setLeaveReason('');
                if (onRefreshLeave) onRefreshLeave();
            } else {
                setLeaveMsg(data.message || 'Gagal mengirim permohonan.');
            }
        } catch {
            setLeaveMsg('Gagal menghubungi server.');
        } finally {
            setLeaveLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulir Pengajuan Surat Izin */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">Pengajuan Izin</h3>

                {leaveMsg && (
                    <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">{leaveMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSendLeave} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold text-xs sm:text-sm">Jenis Keterangan</label>
                        <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-3.5 py-3 text-slate-800 font-medium outline-none cursor-pointer text-sm"
                        >
                            <option value="SAKIT">Sakit</option>
                            <option value="IZIN">Izin</option>
                            <option value="DISPENSASI">Dispensasi</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold text-xs sm:text-sm">Mulai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={leaveStart}
                                onChange={(e) => setLeaveStart(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-3.5 py-3 text-slate-800 font-medium outline-none cursor-pointer text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold text-xs sm:text-sm">Sampai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={leaveEnd}
                                onChange={(e) => setLeaveEnd(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl px-3.5 py-3 text-slate-800 font-medium outline-none cursor-pointer text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold text-xs sm:text-sm">Keterangan / Alasan</label>
                        <textarea
                            rows={4}
                            required
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            placeholder="Alasan izin atau kondisi siswa..."
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-2xl p-3.5 text-slate-800 font-medium outline-none text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={leaveLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        <span>{leaveLoading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                    </button>
                </form>
            </div>

            {/* Riwayat Surat Permohonan */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-900 mb-4">Riwayat Pengajuan</h3>

                    <div className="space-y-3">
                        {leaves.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Belum ada riwayat permohonan surat izin.
                            </div>
                        ) : (
                            leaves.map((l, idx) => (
                                <div
                                    key={`${l.id || 'leave'}-${idx}`}
                                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm space-y-2"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-900">{l.type}</span>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                l.status === 'DISETUJUI'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : l.status === 'DITOLAK'
                                                    ? 'bg-rose-50 text-rose-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            }`}
                                        >
                                            {l.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        {l.start_date} {l.end_date && l.end_date !== l.start_date ? `s/d ${l.end_date}` : ''}
                                    </div>
                                    <p className="text-slate-600 text-sm italic">{l.reason}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
