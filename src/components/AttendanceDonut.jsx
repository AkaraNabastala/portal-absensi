import React from 'react';

export default function AttendanceDonut({ percentage = 100, stats = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 }, size = 'md', title = 'Kehadiran' }) {
    const total = (stats.hadir || 0) + (stats.terlambat || 0) + (stats.izin || 0) + (stats.sakit || 0) + (stats.alpa || 0);

    const radius = 60;
    const circumference = 2 * Math.PI * radius; // ~376.99
    
    const pctHadir = total > 0 ? (stats.hadir / total) : (percentage / 100);
    const pctTerlambat = total > 0 ? (stats.terlambat / total) : 0;
    const pctIzin = total > 0 ? (stats.izin / total) : 0;
    const pctSakit = total > 0 ? (stats.sakit / total) : 0;
    const pctAlpa = total > 0 ? (stats.alpa / total) : 0;

    const strokeDash = (pct) => `${pct * circumference} ${circumference}`;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 pt-2">
            {/* Visual Donut Chart SVG */}
            <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-36 h-36 sm:w-44 sm:h-44 -rotate-90 transform" viewBox="0 0 160 160">
                    {/* Background Ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        className="stroke-slate-100"
                        strokeWidth="14"
                        fill="transparent"
                    />

                    {/* Alpa Segment (Merah) */}
                    {pctAlpa > 0 && (
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            className="stroke-rose-500 transition-all duration-700 ease-out"
                            strokeWidth="14"
                            strokeDasharray={strokeDash(pctAlpa)}
                            strokeDashoffset={-((pctHadir + pctTerlambat + pctIzin + pctSakit) * circumference)}
                            fill="transparent"
                        />
                    )}

                    {/* Sakit Segment (Ungu) */}
                    {pctSakit > 0 && (
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            className="stroke-purple-500 transition-all duration-700 ease-out"
                            strokeWidth="14"
                            strokeDasharray={strokeDash(pctSakit)}
                            strokeDashoffset={-((pctHadir + pctTerlambat + pctIzin) * circumference)}
                            fill="transparent"
                        />
                    )}

                    {/* Izin Segment (Biru) */}
                    {pctIzin > 0 && (
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            className="stroke-sky-400 transition-all duration-700 ease-out"
                            strokeWidth="14"
                            strokeDasharray={strokeDash(pctIzin)}
                            strokeDashoffset={-((pctHadir + pctTerlambat) * circumference)}
                            fill="transparent"
                        />
                    )}

                    {/* Terlambat Segment (Kuning / Oranye) */}
                    {pctTerlambat > 0 && (
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            className="stroke-amber-400 transition-all duration-700 ease-out"
                            strokeWidth="14"
                            strokeDasharray={strokeDash(pctTerlambat)}
                            strokeDashoffset={-(pctHadir * circumference)}
                            fill="transparent"
                        />
                    )}

                    {/* Hadir Segment (Emerald / Hijau) */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        className="stroke-emerald-500 transition-all duration-1000 ease-out"
                        strokeWidth="14"
                        strokeDasharray={strokeDash(pctHadir > 0 ? pctHadir : 0.001)}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>

                {/* Angka Persentase di Tengah Donut Chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        {percentage}%
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {title}
                    </span>
                </div>
            </div>

            {/* Sisi Kanan: Legenda & Rincian Statistik dalam Pastel Card */}
            <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-500 text-xs sm:text-sm">Total Tercatat</span>
                    <span className="font-mono font-black text-slate-900 text-sm sm:text-base">{total} Hari</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                    <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-slate-600 text-xs block font-medium">Hadir</span>
                            <span className="font-black text-emerald-700 text-sm sm:text-base">{stats.hadir || 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 border border-amber-100/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-slate-600 text-xs block font-medium">Terlambat</span>
                            <span className="font-black text-amber-700 text-sm sm:text-base">{stats.terlambat || 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-blue-50/70 border border-blue-100/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-slate-600 text-xs block font-medium">Izin</span>
                            <span className="font-black text-blue-700 text-sm sm:text-base">{stats.izin || 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-purple-50/70 border border-purple-100/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-slate-600 text-xs block font-medium">Sakit</span>
                            <span className="font-black text-purple-700 text-sm sm:text-base">{stats.sakit || 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-rose-50/70 border border-rose-100/80">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-slate-600 text-xs block font-medium">Alpa</span>
                            <span className="font-black text-rose-700 text-sm sm:text-base">{stats.alpa || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
