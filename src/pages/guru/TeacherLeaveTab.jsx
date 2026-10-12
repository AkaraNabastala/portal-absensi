import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export default function TeacherLeaveTab({
    teacherId,
    leaves = [],
    onRefreshLeave,
    formatIndoDate
}) {
    const [myLeaveType, setMyLeaveType] = useState('SAKIT');
    const [myLeaveStart, setMyLeaveStart] = useState(new Date().toISOString().split('T')[0]);
    const [myLeaveEnd, setMyLeaveEnd] = useState(new Date().toISOString().split('T')[0]);
    const [myLeaveReason, setMyLeaveReason] = useState('');
    const [myLeaveMsg, setMyLeaveMsg] = useState('');
    const [myLeaveLoading, setMyLeaveLoading] = useState(false);

    const handleSendMyLeave = async (e) => {
        e.preventDefault();
        setMyLeaveMsg('');
        setMyLeaveLoading(true);
        try {
            const res = await fetch('/api/teacher/submit-leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherId,
                    type: myLeaveType,
                    startDate: myLeaveStart,
                    endDate: myLeaveEnd,
                    reason: myLeaveReason
                })
            });
            const data = await res.json();
            if (data.success) {
                setMyLeaveMsg('Permohonan izin berhasil diajukan.');
                setMyLeaveReason('');
                if (onRefreshLeave) onRefreshLeave();
            } else {
                setMyLeaveMsg(data.message || 'Gagal mengirim permohonan.');
            }
        } catch {
            setMyLeaveMsg('Gagal menghubungi server.');
        } finally {
            setMyLeaveLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Pengajuan Izin Guru */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">Pengajuan Izin</h3>

                {myLeaveMsg && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="font-semibold">{myLeaveMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSendMyLeave} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold">Jenis Keterangan</label>
                        <select
                            value={myLeaveType}
                            onChange={(e) => setMyLeaveType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none cursor-pointer"
                        >
                            <option value="SAKIT">Sakit</option>
                            <option value="IZIN">Izin</option>
                            <option value="CUTI">Cuti</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold">Mulai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={myLeaveStart}
                                onChange={(e) => setMyLeaveStart(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold">Sampai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={myLeaveEnd}
                                onChange={(e) => setMyLeaveEnd(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold">Keterangan / Alasan</label>
                        <textarea
                            rows={3}
                            required
                            value={myLeaveReason}
                            onChange={(e) => setMyLeaveReason(e.target.value)}
                            placeholder="Tuliskan keterangan..."
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl p-3.5 text-slate-800 font-medium outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={myLeaveLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        <span>{myLeaveLoading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                    </button>
                </form>
            </div>

            {/* Riwayat Permohonan Izin Guru */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">Riwayat Pengajuan</h3>

                <div className="space-y-3">
                    {leaves.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada pengajuan izin.
                        </div>
                    ) : (
                        leaves.map((l, idx) => (
                            <div key={`${l.id || 'leave'}-${idx}`} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono text-slate-400">
                                        {formatIndoDate(l.submitted_at)}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        l.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700' :
                                        l.status === 'DITOLAK' ? 'bg-rose-50 text-rose-700' :
                                        'bg-amber-50 text-amber-700'
                                    }`}>
                                        {l.status}
                                    </span>
                                </div>
                                <div className="text-sm font-bold text-blue-700">
                                    [{l.type}] {l.start_date} {l.end_date && l.end_date !== l.start_date ? `s/d ${l.end_date}` : ''}
                                </div>
                                <p className="text-slate-600 text-xs italic">{l.reason}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
