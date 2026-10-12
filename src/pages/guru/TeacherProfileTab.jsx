import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function TeacherProfileTab({
    teacher = {},
    personalData = {},
    isWaliKelas = false,
    currentDivision = '',
    teacherTitle = 'Dewan Guru'
}) {
    return (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                <div className="w-24 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-blue-50 shrink-0 relative flex items-center justify-center">
                    <span className="text-blue-600 text-4xl font-black select-none">
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
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                        {teacherTitle}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {teacher.full_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        NIP: <b className="font-mono text-slate-800">{teacher.nip || '-'}</b>
                    </p>
                    {isWaliKelas && (
                        <p className="text-sm text-blue-700 font-bold mt-1 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" />
                            Wali Kelas: {currentDivision}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-3.5 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">NIP Guru</span>
                    <span className="font-mono font-bold text-slate-900">{teacher.nip || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">NIK / NUPTK</span>
                    <span className="font-mono font-bold text-slate-900">{teacher.nik || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Tugas Pokok</span>
                    <span className="font-bold text-slate-900">{teacherTitle}</span>
                </div>
                {isWaliKelas && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Kelas Binaan</span>
                        <span className="font-bold text-blue-700">{currentDivision}</span>
                    </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Nomor HP (WhatsApp)</span>
                    <span className="font-mono font-bold text-emerald-600">
                        {teacher.phone_number || personalData?.student?.phone_number || '-'}
                    </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">ID Telegram</span>
                    <span className="font-mono font-bold text-blue-600">
                        {teacher.telegram_chat_id || personalData?.student?.telegram_chat_id || '-'}
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
