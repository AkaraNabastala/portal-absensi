import React, { useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    AlertCircle 
} from 'lucide-react';

import StudentOverviewTab from './StudentOverviewTab';
import StudentDailyTab from './StudentDailyTab';
import StudentLeaveTab from './StudentLeaveTab';
import StudentProfileTab from './StudentProfileTab';
import StudentSubjectAttendanceTab from './StudentSubjectAttendanceTab';
import StudentEkskulAttendanceTab from './StudentEkskulAttendanceTab';

export default function WaliDashboard({ student, parentData, activeTab, setActiveTab, onRefresh, schoolInfo }) {
    const [selectedMonth, setSelectedMonth] = useState('');

    const todayLog = parentData?.todayLog;
    const stats = parentData?.stats || { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 };
    const attendancePercentage = parentData?.attendancePercentage ?? 100;
    const availableMonths = parentData?.availableMonths || [];
    const currentMonth = selectedMonth || parentData?.currentMonth || '';

    const handleMonthChange = (e) => {
        const val = e.target.value;
        setSelectedMonth(val);
        if (onRefresh) onRefresh(val);
    };

    const formatIndoDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Mobile */}
            <div className="block md:hidden -mx-3 -mt-3 mb-4">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white pt-4 pb-10 px-5 rounded-b-[2rem] shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">
                                {student.full_name}
                            </h2>
                            <p className="text-xs text-blue-100 font-medium mt-1">
                                NIPD/NISN : <span className="font-mono font-bold text-white">{student.nipd && student.nisn && student.nipd !== student.nisn ? `${student.nipd} / ${student.nisn}` : (student.nipd || student.nisn || '-')}</span>
                            </p>
                            <p className="text-xs text-blue-100 font-medium mt-0.5">
                                Kelas : <span className="font-bold text-white">{student.division || '-'}</span>
                            </p>
                        </div>
                        <div className="w-[60px] h-[80px] rounded-xl overflow-hidden border-2 border-white/80 shadow-md bg-white/20 shrink-0 relative flex items-center justify-center">
                            <span className="text-white font-black text-xl select-none">
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
                    </div>
                </div>

                {/* Floating Card: Status Hari Ini */}
                <div className="-mt-6 mx-4 bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-slate-100 relative z-10 flex items-center justify-between">
                    <div>
                        <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
                            Presensi Hari Ini
                        </span>
                        <div className="mt-1">
                            {todayLog?.status === 'HADIR' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HADIR
                                </span>
                            ) : todayLog?.status === 'TERLAMBAT' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> TERLAMBAT
                                </span>
                            ) : todayLog?.status ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> {todayLog.status}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                    BELUM SCAN
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right border-l border-slate-100 pl-4">
                        <span className="text-xs text-slate-400 font-bold block">Jam Masuk</span>
                        <span className="text-sm font-mono font-black text-slate-900 mt-0.5 block">
                            {todayLog?.time_in || '--:--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Header Desktop */}
            <div className="hidden md:flex justify-between items-center bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-5">
                    <div className="w-21 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-blue-50 shrink-0 relative flex items-center justify-center">
                        <span className="text-blue-600 font-black text-3xl select-none">
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
                        <h2 className="text-2xl font-black text-slate-900 truncate">
                            {student.full_name}
                        </h2>
                        <p className="text-sm font-medium text-slate-600 mt-1">
                            NIPD/NISN : <span className="font-mono font-bold text-slate-800">{student.nipd && student.nisn && student.nipd !== student.nisn ? `${student.nipd} / ${student.nisn}` : (student.nipd || student.nisn || '-')}</span>
                        </p>
                        <p className="text-sm font-medium text-slate-600 mt-0.5">
                            Kelas : <span className="font-bold text-blue-600">{student.division || '-'}</span>
                        </p>
                    </div>
                </div>

                {/* Status Hari Ini di Desktop */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-5 py-3.5 flex items-center gap-6">
                    <div>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                            Kehadiran Hari Ini
                        </span>
                        <div className="text-base font-black mt-1">
                            {todayLog?.status === 'HADIR' ? (
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> HADIR
                                </span>
                            ) : todayLog?.status === 'TERLAMBAT' ? (
                                <span className="text-amber-600 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" /> TERLAMBAT
                                </span>
                            ) : todayLog?.status ? (
                                <span className="text-blue-600 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" /> {todayLog.status}
                                </span>
                            ) : (
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    BELUM SCAN
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="border-l border-slate-200 pl-5 text-right">
                        <span className="text-xs text-slate-400 font-bold block">Jam Masuk</span>
                        <span className="text-base font-mono font-black text-slate-800">
                            {todayLog?.time_in || '--:--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT ROUTING */}
            {activeTab === 'overview' && (
                <StudentOverviewTab
                    student={student}
                    parentData={parentData}
                    stats={stats}
                    attendancePercentage={attendancePercentage}
                    setActiveTab={setActiveTab}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'daily' && (
                <StudentDailyTab
                    logs={parentData?.logs || []}
                    stats={stats}
                    availableMonths={availableMonths}
                    currentMonth={currentMonth}
                    onMonthChange={handleMonthChange}
                    formatIndoDate={formatIndoDate}
                />
            )}

            {activeTab === 'subject_att' && (
                <StudentSubjectAttendanceTab
                    student={student}
                />
            )}

            {activeTab === 'ekskul_att' && (
                <StudentEkskulAttendanceTab
                    student={student}
                />
            )}

            {activeTab === 'leave' && (
                <StudentLeaveTab
                    studentId={student.id}
                    leaves={parentData?.leaves || []}
                    onRefreshLeave={() => onRefresh && onRefresh(currentMonth)}
                />
            )}

            {activeTab === 'profile' && (
                <StudentProfileTab
                    student={student}
                />
            )}
        </div>
    );
}
