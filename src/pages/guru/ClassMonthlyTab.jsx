import React from 'react';
import { Briefcase, FileText, Calendar, Info } from 'lucide-react';

export default function ClassMonthlyTab({
    currentDivision,
    classFilterBulan,
    classFilterTahun,
    handleClassMonthYearChange,
    classStudents = [],
    sortedClassStudents = [],
    classSortConfig = {},
    handleClassSort
}) {
    const daysInMonth = new Date(classFilterTahun, classFilterBulan, 0).getDate();
    const namaBulan = new Date(classFilterTahun, classFilterBulan - 1).toLocaleString('id-ID', { month: 'long' });

    return (
        <div className="space-y-6 pb-12 font-sans flex flex-col">
            {/* Toolbar Filter */}
            <div className="relative bg-white border border-slate-200/80 p-5 sm:p-6 rounded-3xl shadow-xs overflow-hidden shrink-0">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                                <Briefcase size={13} />
                                Wali Kelas {currentDivision}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <FileText className="text-emerald-600" size={26} /> 
                            Rekap Bulanan
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {/* Filter Bulan */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                            <Calendar size={15} className="text-slate-400 shrink-0" />
                            <select
                                value={classFilterBulan}
                                onChange={(e) => handleClassMonthYearChange(parseInt(e.target.value), classFilterTahun)}
                                className="bg-transparent border-none outline-none text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Tahun */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                            <select
                                value={classFilterTahun}
                                onChange={(e) => handleClassMonthYearChange(classFilterBulan, parseInt(e.target.value))}
                                className="bg-transparent border-none outline-none text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
                            >
                                {[...Array(5)].map((_, i) => {
                                    const year = new Date().getFullYear() - 2 + i;
                                    return <option key={year} value={year}>{year}</option>;
                                })}
                            </select>
                        </div>

                        <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-1">
                            <span>Total:</span>
                            <span className="font-black text-blue-900">{classStudents.length} Siswa</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAMPILAN MOBILE: DAFTAR KARTU REKAPITULASI RINGKAS (BLOCK MD:HIDDEN) */}
            <div className="block md:hidden space-y-3">
                {sortedClassStudents.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200/80 rounded-3xl text-slate-400 text-sm">
                        Belum ada data siswa di kelas {currentDivision}.
                    </div>
                ) : (
                    sortedClassStudents.map((s, idx) => (
                        <div 
                            key={s.id || idx}
                            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-sm truncate">{s.full_name}</h4>
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {s.nisn ? `NISN: ${s.nisn}` : (s.nipd ? `NIPD: ${s.nipd}` : '-')}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                        {s.stats?.rate || 0}% Hadir
                                    </span>
                                </div>
                            </div>

                            {/* Rekapan 5 Metrik Ringkas */}
                            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100 text-center">
                                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl py-1.5 px-1">
                                    <span className="text-[10px] font-bold text-emerald-700 block">H</span>
                                    <span className="text-xs font-black text-emerald-800">{s.stats?.hadir || 0}</span>
                                </div>
                                <div className="bg-amber-50/70 border border-amber-100 rounded-xl py-1.5 px-1">
                                    <span className="text-[10px] font-bold text-amber-700 block">T</span>
                                    <span className="text-xs font-black text-amber-800">{s.stats?.terlambat || 0}</span>
                                </div>
                                <div className="bg-blue-50/70 border border-blue-100 rounded-xl py-1.5 px-1">
                                    <span className="text-[10px] font-bold text-blue-700 block">S</span>
                                    <span className="text-xs font-black text-blue-800">{s.stats?.sakit || 0}</span>
                                </div>
                                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl py-1.5 px-1">
                                    <span className="text-[10px] font-bold text-indigo-700 block">I</span>
                                    <span className="text-xs font-black text-indigo-800">{s.stats?.izin || 0}</span>
                                </div>
                                <div className="bg-rose-50/70 border border-rose-100 rounded-xl py-1.5 px-1">
                                    <span className="text-[10px] font-bold text-rose-700 block">A</span>
                                    <span className="text-xs font-black text-rose-800">{s.stats?.alpa || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* TAMPILAN DESKTOP: TABEL MATRIKS PRESENSI PENUH (HIDDEN MD:BLOCK) */}
            <div className="hidden md:flex bg-white border border-slate-200/80 rounded-3xl shadow-xs flex-col overflow-hidden">
                {/* Legenda Status */}
                <div className="flex flex-wrap items-center gap-3.5 p-4 border-b border-slate-100 bg-slate-50/70 text-[11px] sm:text-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Info size={14} className="text-blue-600" />
                        <span className="font-bold text-slate-700">Keterangan:</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-emerald-600 px-1 rounded bg-emerald-50 border border-emerald-200">H</span>
                        <span className="text-slate-600">Hadir</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-amber-600 px-1 rounded bg-amber-50 border border-amber-200">T</span>
                        <span className="text-slate-600">Terlambat</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-blue-600 px-1 rounded bg-blue-50 border border-blue-200">S</span>
                        <span className="text-slate-600">Sakit</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-indigo-600 px-1 rounded bg-indigo-50 border border-indigo-200">I</span>
                        <span className="text-slate-600">Izin</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-rose-600 px-1 rounded bg-rose-50 border border-rose-200">A</span>
                        <span className="text-slate-600">Alfa</span>
                    </div>
                </div>

                {/* Kontainer Matriks dengan Sticky Table Header & Left Columns */}
                <div className="overflow-x-auto bg-white min-w-full">
                    <table className="w-full text-left text-sm border-collapse min-w-[950px]">
                        <thead className="bg-slate-50/90 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                            <tr>
                                <th className="p-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-20 w-10 text-center">
                                    No
                                </th>
                                <th 
                                    className="p-3 border-r border-slate-200 sticky left-10 bg-slate-100 z-20 w-52 shadow-[4px_0_12px_rgba(0,0,0,0.03)] cursor-pointer hover:bg-slate-200 transition"
                                    onClick={() => handleClassSort('full_name')}
                                >
                                    Nama Siswa {classSortConfig.key === 'full_name' ? (classSortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>

                                {/* Kolom Tanggal 1 s.d. Akhir Bulan */}
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                    <th 
                                        key={i} 
                                        className="p-1 border-r border-slate-200 text-center text-[10px] w-7 text-slate-600 font-mono"
                                    >
                                        {i + 1}
                                    </th>
                                ))}

                                {/* Kolom Rekapitulasi */}
                                <th className="p-2 border-r border-slate-200 bg-emerald-100 text-emerald-800 text-center w-8 text-[11px] font-black" title="Total Hadir">
                                    H
                                </th>
                                <th className="p-2 border-r border-slate-200 bg-amber-100 text-amber-800 text-center w-8 text-[11px] font-black" title="Total Terlambat">
                                    T
                                </th>
                                <th className="p-2 border-r border-slate-200 bg-blue-100 text-blue-800 text-center w-8 text-[11px] font-black" title="Total Sakit">
                                    S
                                </th>
                                <th className="p-2 border-r border-slate-200 bg-indigo-100 text-indigo-800 text-center w-8 text-[11px] font-black" title="Total Izin">
                                    I
                                </th>
                                <th className="p-2 border-r border-slate-200 bg-rose-100 text-rose-800 text-center w-8 text-[11px] font-black" title="Total Alpa">
                                    A
                                </th>
                                <th className="p-2 bg-blue-50 text-blue-700 text-center w-14 text-[11px] font-black" title="Persentase Kehadiran">
                                    %
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedClassStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 8} className="text-center py-16 text-slate-400 text-sm">
                                        Belum ada data siswa di kelas {currentDivision}.
                                    </td>
                                </tr>
                            ) : (
                                sortedClassStudents.map((m, idx) => {
                                    const attMap = m.attendance || {};
                                    return (
                                        <tr key={m.id || idx} className="hover:bg-blue-50/40 transition group">
                                            <td className="p-2.5 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-blue-50/40 text-center font-mono text-[11px] text-slate-400">
                                                {idx + 1}
                                            </td>

                                            <td className="p-2.5 border-r border-slate-100 sticky left-10 bg-white group-hover:bg-blue-50/40 shadow-[4px_0_12px_rgba(0,0,0,0.02)] min-w-[180px] max-w-[220px]">
                                                <div className="font-bold text-slate-900 text-xs truncate">
                                                    {m.full_name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {m.nisn ? `NISN: ${m.nisn}` : (m.nipd ? `NIPD: ${m.nipd}` : '-')}
                                                </div>
                                            </td>

                                            {Array.from({ length: daysInMonth }, (_, i) => {
                                                const day = i + 1;
                                                const sObj = attMap[day];
                                                const status = typeof sObj === 'object' ? sObj?.status : sObj;
                                                const isLupa = typeof sObj === 'object' ? sObj?.isLupaMasuk : false;

                                                return (
                                                    <td 
                                                        key={i} 
                                                        className="p-0 border-r border-slate-100 text-center border-b text-[10px] font-sans"
                                                    >
                                                        <div className="w-full h-full min-h-[30px] flex items-center justify-center">
                                                            {status === 'HADIR' ? (
                                                                isLupa ? (
                                                                    <span className="font-black text-[10px] text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200" title="Hadir (Lupa Jam Masuk)">
                                                                        H
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-black text-[10px] text-emerald-600" title="Hadir Tepat Waktu">
                                                                        H
                                                                    </span>
                                                                )
                                                            ) : status === 'TERLAMBAT' ? (
                                                                <span className="font-black text-[10px] text-amber-600" title="Terlambat">
                                                                    T
                                                                </span>
                                                            ) : status === 'SAKIT' ? (
                                                                <span className="font-black text-[10px] text-blue-600" title="Sakit">
                                                                    S
                                                                </span>
                                                            ) : status === 'IZIN' ? (
                                                                <span className="font-black text-[10px] text-indigo-600" title="Izin">
                                                                    I
                                                                </span>
                                                            ) : (status === 'ALFA' || status === 'ALPA') ? (
                                                                <span className="font-black text-[10px] text-rose-600" title="Alpa / Tanpa Keterangan">
                                                                    A
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-200 text-[9px] select-none">•</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            <td className="p-1 border-r border-slate-100 text-center font-bold bg-emerald-50/50 text-emerald-700 text-xs">
                                                {m.stats?.hadir || 0}
                                            </td>
                                            <td className="p-1 border-r border-slate-100 text-center font-bold bg-amber-50/50 text-amber-700 text-xs">
                                                {m.stats?.terlambat || 0}
                                            </td>
                                            <td className="p-1 border-r border-slate-100 text-center font-bold bg-blue-50/50 text-blue-700 text-xs">
                                                {m.stats?.sakit || 0}
                                            </td>
                                            <td className="p-1 border-r border-slate-100 text-center font-bold bg-indigo-50/50 text-indigo-700 text-xs">
                                                {m.stats?.izin || 0}
                                            </td>
                                            <td className="p-1 border-r border-slate-100 text-center font-bold bg-rose-50/50 text-rose-700 text-xs">
                                                {m.stats?.alpa || 0}
                                            </td>
                                            <td className="p-1 text-center font-black bg-blue-50/70 text-blue-800 text-xs">
                                                {m.stats?.rate || 0}%
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
