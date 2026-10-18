import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Plus, 
    Trash2, 
    Clock, 
    BookOpen, 
    User, 
    MapPin, 
    Check, 
    Search,
    Layers,
    Filter
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function AdminSchedulesTab() {
    const [schedules, setSchedules] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Filter
    const [filterDivision, setFilterDivision] = useState('ALL');
    const [filterDay, setFilterDay] = useState('ALL');
    const [filterTeacher, setFilterTeacher] = useState('ALL');

    // Form Tambah Jadwal
    const [teacherId, setTeacherId] = useState('');
    const [division, setDivision] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [dayName, setDayName] = useState('Senin');
    const [startTime, setStartTime] = useState('07:30');
    const [endTime, setEndTime] = useState('09:30');
    const [room, setRoom] = useState('Ruang Kelas');

    const loadData = async () => {
        try {
            setLoading(true);
            const [resSchedules, resTeachers, resDivisions] = await Promise.all([
                authFetch('/api/admin/schedules').then(r => r.json()),
                authFetch('/api/admin/teachers').then(r => r.json()),
                authFetch('/api/admin/divisions').then(r => r.json())
            ]);

            if (resSchedules.success) setSchedules(resSchedules.data || []);
            if (resTeachers.success) {
                setTeachers(resTeachers.data || []);
                if (resTeachers.data?.length > 0 && !teacherId) {
                    setTeacherId(resTeachers.data[0].id);
                }
            }
            if (resDivisions.success) {
                setDivisions(resDivisions.data || []);
                if (resDivisions.data?.length > 0 && !division) {
                    setDivision(resDivisions.data[0].name);
                }
            }
        } catch (e) {
            console.error('Error load schedules data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!teacherId || !division || !subjectName || !dayName || !startTime || !endTime) {
            alert('Semua bidang jadwal wajib diisi.');
            return;
        }

        try {
            const res = await authFetch('/api/admin/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teacherId,
                    division,
                    subjectName,
                    dayName,
                    startTime,
                    endTime,
                    room
                })
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(`Jadwal "${subjectName}" kelas ${division} berhasil ditambahkan.`);
                setTimeout(() => setStatusMessage(''), 3000);
                setShowModal(false);
                setSubjectName('');
                loadData();
            } else {
                alert(data.message || 'Gagal menambahkan jadwal.');
            }
        } catch {
            alert('Gagal menghubungi server.');
        }
    };

    const handleDelete = async (id, subjectName, div) => {
        if (!confirm(`Hapus jadwal ${subjectName} untuk kelas ${div}?`)) return;

        try {
            const res = await authFetch(`/api/admin/schedules/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(`Jadwal ${subjectName} berhasil dihapus.`);
                setTimeout(() => setStatusMessage(''), 3000);
                loadData();
            }
        } catch {
            alert('Gagal menghapus jadwal.');
        }
    };

    const filteredSchedules = schedules.filter(s => {
        const matchesDiv = filterDivision === 'ALL' || s.division === filterDivision;
        const matchesDay = filterDay === 'ALL' || s.day_name === filterDay;
        const matchesTeach = filterTeacher === 'ALL' || String(s.teacher_id) === String(filterTeacher);
        return matchesDiv && matchesDay && matchesTeach;
    });

    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    return (
        <div className="space-y-6">
            {/* Status Notifikasi */}
            {statusMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{statusMessage}</span>
                </div>
            )}

            {/* Header Manajemen Jadwal */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        Penugasan Pembelajaran
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
                        Atur Guru & Jadwal Mata Pelajaran
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        Tentukan penugasan guru pengampu mapel, rombel kelas, hari, jam, dan ruangan belajar
                    </p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Jadwal Mapel</span>
                </button>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <Filter className="w-4 h-4 text-slate-400" />
                    Filter:
                </div>

                {/* Filter Kelas */}
                <select
                    value={filterDivision}
                    onChange={(e) => setFilterDivision(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                    <option value="ALL">Semua Kelas</option>
                    {divisions.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                </select>

                {/* Filter Hari */}
                <select
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                    <option value="ALL">Semua Hari</option>
                    {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                {/* Filter Guru */}
                <select
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                >
                    <option value="ALL">Semua Guru Pengampu</option>
                    {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                </select>

                <div className="ml-auto text-xs text-slate-400 font-bold">
                    Total: {filteredSchedules.length} Jadwal Terdaftar
                </div>
            </div>

            {/* Tabel / Grid Daftar Jadwal */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
                {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        Memuat daftar jadwal pelajaran...
                    </div>
                ) : filteredSchedules.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-700 text-sm">Belum Ada Jadwal Pelajaran</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            Klik tombol "Tambah Jadwal Mapel" untuk menentukan guru pengampu mata pelajaran di tiap kelas.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4">Kelas</th>
                                    <th className="py-3 px-4">Mata Pelajaran</th>
                                    <th className="py-3 px-4">Guru Pengampu</th>
                                    <th className="py-3 px-4">Hari & Jam</th>
                                    <th className="py-3 px-4">Ruang</th>
                                    <th className="py-3 px-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredSchedules.map(sch => (
                                    <tr key={sch.id} className="hover:bg-slate-50/80 transition">
                                        <td className="py-3.5 px-4 font-bold text-blue-700">
                                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs">
                                                {sch.division}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                            {sch.subject_name}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-medium text-slate-800">{sch.teacher_name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">NIP: {sch.teacher_nip || '-'}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-xs text-slate-700">{sch.day_name}</div>
                                            <div className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                {sch.start_time} - {sch.end_time}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                {sch.room || 'Ruang Kelas'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <button
                                                onClick={() => handleDelete(sch.id, sch.subject_name, sch.division)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                title="Hapus Jadwal"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Tambah Jadwal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Tambah Penugasan Jadwal</h3>
                                <p className="text-xs text-slate-400">Atur guru pengampu mapel untuk kelas tertentu</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            {/* Rombel / Kelas */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Kelas / Rombel</label>
                                <select
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                    required
                                >
                                    {divisions.map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Nama Mapel */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Mata Pelajaran</label>
                                <input
                                    type="text"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    placeholder="Contoh: Pemrograman Web, Matematika, dsb"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Guru Pengampu */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Guru Pengampu</label>
                                <select
                                    value={teacherId}
                                    onChange={(e) => setTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                    required
                                >
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.full_name} ({t.nip || 'NIP -'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Hari & Ruangan */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Hari Belajar</label>
                                    <select
                                        value={dayName}
                                        onChange={(e) => setDayName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        {days.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Ruangan / Lab</label>
                                    <input
                                        type="text"
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                        placeholder="Ruang Kelas, Lab 1..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Jam Mulai & Selesai */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jam Mulai</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jam Selesai</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                                >
                                    Simpan Jadwal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
