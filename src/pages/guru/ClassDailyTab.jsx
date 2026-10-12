import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function ClassDailyTab({
    currentDivision,
    classFilterDate,
    setClassFilterDate,
    students = [],
    setSelectedStudentId,
    setActiveTab
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStudents = students.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (s.full_name && s.full_name.toLowerCase().includes(q)) ||
               (s.nisn && s.nisn.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                Wali Kelas {currentDivision}
                            </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-1">
                            Presensi Siswa
                        </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                            type="date"
                            value={classFilterDate}
                            onChange={(e) => setClassFilterDate(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                        />
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama / NISN..."
                                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 w-full sm:w-56 font-medium"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>

                {/* Tampilan Mobile Card List */}
                <div className="block sm:hidden space-y-2.5">
                    {filteredStudents.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                            Belum ada data siswa di kelas {currentDivision}.
                        </div>
                    ) : (
                        filteredStudents.map((s, idx) => (
                            <div key={`${s.id || 'student'}-${idx}`} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-200 bg-blue-50 shrink-0 relative flex items-center justify-center">
                                        <span className="text-blue-600 font-bold text-sm select-none">
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
                                    <div className="min-w-0">
                                        <span className="font-bold text-slate-900 text-sm block truncate max-w-[150px]">{s.full_name}</span>
                                        <span className="text-xs text-slate-400 font-mono block">NISN: {s.nisn}</span>
                                        <span className="text-xs text-emerald-600 font-mono font-bold">
                                            Masuk: {s.time_in || '--:--'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                        s.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700' :
                                        s.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-700' :
                                        s.status === 'IZIN' ? 'bg-blue-50 text-blue-700' :
                                        s.status === 'SAKIT' ? 'bg-purple-50 text-purple-700' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {s.status || 'BELUM SCAN'}
                                    </span>
                                    <button
                                        onClick={() => { setSelectedStudentId(s.id); setActiveTab('class_leave'); }}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold cursor-pointer"
                                    >
                                        + Izin
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Tampilan Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                            <tr>
                                <th className="py-3.5 px-4">Nama Siswa</th>
                                <th className="py-3.5 px-4">Kelas</th>
                                <th className="py-3.5 px-4">Jam Masuk</th>
                                <th className="py-3.5 px-4">Jam Pulang</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-400">
                                        Belum ada data siswa di kelas {currentDivision}.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((s, idx) => (
                                    <tr key={`${s.id || 'student'}-${idx}`} className="hover:bg-slate-50 transition">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-9 h-12 rounded-md overflow-hidden border border-slate-200 bg-blue-50 shrink-0 relative flex items-center justify-center">
                                                    <span className="text-blue-600 font-bold text-xs select-none">
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
                                                <div>
                                                    <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                                                        {s.full_name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        NISN: {s.nisn}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-slate-700">{s.division}</td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{s.time_in || '--:--'}</td>
                                        <td className="py-3.5 px-4 font-mono text-blue-600">{s.time_out || '--:--'}</td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                s.status === 'HADIR' ? 'bg-emerald-50 text-emerald-700' :
                                                s.status === 'TERLAMBAT' ? 'bg-amber-50 text-amber-700' :
                                                s.status === 'IZIN' ? 'bg-blue-50 text-blue-700' :
                                                s.status === 'SAKIT' ? 'bg-purple-50 text-purple-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {s.status || 'BELUM SCAN'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <button
                                                onClick={() => { setSelectedStudentId(s.id); setActiveTab('class_leave'); }}
                                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                            >
                                                + Input Izin
                                            </button>
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
