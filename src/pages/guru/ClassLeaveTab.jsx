import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ClassLeaveTab({
    currentDivision,
    classStudents = [],
    selectedStudentId,
    setSelectedStudentId,
    studentLeaveType,
    setStudentLeaveType,
    studentLeaveStart,
    setStudentLeaveStart,
    studentLeaveEnd,
    setStudentLeaveEnd,
    studentLeaveReason,
    setStudentLeaveReason,
    inputStudentLoading,
    handleTeacherCreateStudentLeave,
    pendingLeaves = [],
    classLeaves = [],
    actionLoading,
    handleActionLeave,
    formatIndoDate
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Input Izin Siswa */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <span className="px-3 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Wali Kelas {currentDivision}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 mb-4">Catat Izin Siswa</h3>

                <form onSubmit={handleTeacherCreateStudentLeave} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold">Pilih Siswa</label>
                        <select
                            required
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:border-blue-600 cursor-pointer"
                        >
                            <option value="">-- Pilih Siswa Kelas {currentDivision} --</option>
                            {classStudents.map((s, idx) => (
                                <option key={`${s.id || 'student'}-${idx}`} value={s.id}>
                                    {s.full_name} (NISN: {s.nisn})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold">Jenis Izin</label>
                        <select
                            value={studentLeaveType}
                            onChange={(e) => setStudentLeaveType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:border-blue-600 cursor-pointer"
                        >
                            <option value="SAKIT">Sakit</option>
                            <option value="IZIN">Izin</option>
                            <option value="DISPENSASI">Dispensasi</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold">Mulai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={studentLeaveStart}
                                onChange={(e) => setStudentLeaveStart(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:border-blue-600 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 mb-1.5 font-bold">Sampai Tanggal</label>
                            <input
                                type="date"
                                required
                                value={studentLeaveEnd}
                                onChange={(e) => setStudentLeaveEnd(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:border-blue-600 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-700 mb-1.5 font-bold">Keterangan / Alasan</label>
                        <textarea
                            rows={3}
                            required
                            value={studentLeaveReason}
                            onChange={(e) => setStudentLeaveReason(e.target.value)}
                            placeholder="Alasan izin murid..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 font-medium outline-none focus:border-blue-600"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={inputStudentLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{inputStudentLoading ? 'Menyimpan...' : 'Simpan Izin Murid'}</span>
                    </button>
                </form>
            </div>

            {/* Persetujuan Izin Masuk dari Orang Tua */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-slate-900">Permohonan Izin Masuk</h3>
                    {pendingLeaves.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                            {pendingLeaves.length} Menunggu
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    {classLeaves.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada permohonan izin dari murid kelas {currentDivision}.
                        </div>
                    ) : (
                        classLeaves.map((l, idx) => (
                            <div key={`${l.id || 'leave'}-${idx}`} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{l.full_name}</h4>
                                        <span className="text-xs text-slate-400 font-mono">
                                            NISN: {l.nisn} • Tgl: {formatIndoDate(l.submitted_at)}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        l.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700' :
                                        l.status === 'DITOLAK' ? 'bg-rose-50 text-rose-700' :
                                        'bg-amber-50 text-amber-700'
                                    }`}>
                                        {l.status}
                                    </span>
                                </div>

                                <div className="text-sm text-blue-700 font-bold">
                                    [{l.type}] {l.start_date} {l.end_date && l.end_date !== l.start_date ? `s/d ${l.end_date}` : ''}
                                </div>
                                <p className="text-slate-600 text-xs italic">{l.reason}</p>

                                {l.status === 'MENUNGGU' && (
                                    <div className="flex gap-2.5 pt-2 border-t border-slate-200/60">
                                        <button
                                            disabled={actionLoading === l.id}
                                            onClick={() => handleActionLeave(l.id, 'DISETUJUI')}
                                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Setujui</span>
                                        </button>
                                        <button
                                            disabled={actionLoading === l.id}
                                            onClick={() => handleActionLeave(l.id, 'DITOLAK')}
                                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>Tolak</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
