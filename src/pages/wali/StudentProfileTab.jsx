import React from 'react';

export default function StudentProfileTab({
    student = {}
}) {
    return (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header Profil Siswa */}
            <div className="flex items-center gap-5 sm:gap-6 pb-6 border-b border-slate-100">
                <div className="w-24 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-blue-50 shrink-0 relative flex items-center justify-center">
                    <span className="text-blue-600 text-3xl font-black select-none">
                        {student.full_name?.charAt(0) || 'S'}
                    </span>
                    {student.photo_url && (
                        <img
                            src={student.photo_url}
                            alt={student.full_name}
                            className="absolute inset-0 w-full h-full object-cover object-center bg-white"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                </div>
                <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                        Siswa Aktif
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {student.full_name}
                    </h3>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                        Kelas / Rombel : <b className="text-blue-700">{student.division || '-'}</b>
                    </p>
                </div>
            </div>

            {/* Rincian Identitas Siswa */}
            <div className="space-y-3.5 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">NISN</span>
                    <span className="font-mono font-bold text-slate-900">{student.nisn || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">NIPD</span>
                    <span className="font-mono font-bold text-slate-900">{student.nipd || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Barcode / RFID ID</span>
                    <span className="font-mono font-bold text-blue-600">{student.barcode_id || student.nisn || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Kelas / Rombel</span>
                    <span className="font-bold text-slate-900">{student.division || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Nomor HP (WhatsApp)</span>
                    <span className="font-mono font-bold text-emerald-600">
                        {student.phone_number || student.parent_phone || '-'}
                    </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">ID Telegram</span>
                    <span className="font-mono font-bold text-blue-600">
                        {student.telegram_chat_id || '-'}
                    </span>
                </div>
                <div className="flex justify-between py-2">
                    <span className="text-slate-500">Status</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                        Aktif
                    </span>
                </div>
            </div>
        </div>
    );
}
