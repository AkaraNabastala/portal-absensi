import React from 'react';
import { Phone } from 'lucide-react';

export default function ClassStudentsTab({
    currentDivision,
    classStudents = []
}) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div>
                    <span className="px-3 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        Wali Kelas {currentDivision}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                        Daftar Siswa
                    </h3>
                </div>
                <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-100">
                    Total {classStudents.length} Siswa
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classStudents.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                        Belum ada siswa terdaftar di rombel {currentDivision}.
                    </div>
                ) : (
                    classStudents.map((s, idx) => (
                        <div
                            key={`${s.id || 'student'}-${idx}`}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4 hover:bg-slate-100/70 transition"
                        >
                            <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 bg-blue-50 shrink-0 relative flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-base select-none">
                                    {s.full_name?.charAt(0) || 'S'}
                                </span>
                                {s.photo_url && (
                                    <img
                                        src={s.photo_url}
                                        alt={s.full_name}
                                        className="absolute inset-0 w-full h-full object-cover object-center bg-white"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{s.full_name}</h4>
                                <div className="text-xs text-slate-400 font-mono">
                                    NISN: {s.nisn || '-'} • NIPD: {s.nipd || '-'}
                                </div>
                                <div className="pt-1.5 space-y-1 text-xs">
                                    {(s.phone_number || s.parent_phone) && (
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-600 font-mono">
                                            <Phone className="w-3.5 h-3.5 shrink-0" />
                                            <span>{s.phone_number || s.parent_phone}</span>
                                        </div>
                                    )}
                                    {s.telegram_chat_id && (
                                        <div className="flex items-center gap-1.5 font-bold text-blue-600 font-mono">
                                            <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-black shrink-0">TG</span>
                                            <span>{s.telegram_chat_id}</span>
                                        </div>
                                    )}
                                    {!(s.phone_number || s.parent_phone) && !s.telegram_chat_id && (
                                        <span className="text-slate-400 italic">Kontak belum disetel</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
