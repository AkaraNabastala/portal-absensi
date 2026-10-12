import React, { useState, useEffect } from 'react';
import { 
    Award, 
    Plus, 
    Trash2, 
    Calendar, 
    Clock, 
    MapPin, 
    Users,
    Check
} from 'lucide-react';

export default function AdminEkskulTab() {
    const [extracurriculars, setExtracurriculars] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [mentorTeacherId, setMentorTeacherId] = useState('');
    const [dayName, setDayName] = useState('Jumat');
    const [startTime, setStartTime] = useState('14:00');
    const [endTime, setEndTime] = useState('16:00');
    const [location, setLocation] = useState('Area Sekolah');
    const [description, setDescription] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const [resEkskul, resTeachers] = await Promise.all([
                fetch('/api/extracurriculars').then(r => r.json()),
                fetch('/api/admin/teachers').then(r => r.json())
            ]);
            if (resEkskul.success) setExtracurriculars(resEkskul.data || []);
            if (resTeachers.success) {
                setTeachers(resTeachers.data || []);
                if (resTeachers.data?.length > 0 && !mentorTeacherId) {
                    setMentorTeacherId(resTeachers.data[0].id);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name || !mentorTeacherId) {
            alert('Nama ekskul dan guru pembina wajib diisi!');
            return;
        }

        try {
            const res = await fetch('/api/admin/extracurriculars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    mentorTeacherId,
                    dayName,
                    startTime,
                    endTime,
                    location,
                    description
                })
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(`Ekstrakurikuler ${name} berhasil dibuat!`);
                setTimeout(() => setStatusMessage(''), 3000);
                setShowModal(false);
                setName('');
                setDescription('');
                loadData();
            } else {
                alert(data.message || 'Gagal membuat ekskul.');
            }
        } catch (err) {
            alert('Terjadi kesalahan.');
        }
    };

    const handleDelete = async (id, ekskulName) => {
        if (!confirm(`Hapus kegiatan ekstrakurikuler "${ekskulName}"?`)) return;

        try {
            const res = await fetch(`/api/admin/extracurriculars/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(`Ekstrakurikuler "${ekskulName}" berhasil dihapus.`);
                setTimeout(() => setStatusMessage(''), 3000);
                loadData();
            }
        } catch (err) {
            alert('Gagal menghapus ekskul.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Notifikasi Status */}
            {statusMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{statusMessage}</span>
                </div>
            )}

            {/* Header Ekstrakurikuler */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        Manajemen Ekstrakurikuler
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Daftar kegiatan ekskul dan penunjukan Guru Pembina resmi yang berwenang
                    </p>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Tambah Ekskul Baru</span>
                </button>
            </div>

            {/* Grid Daftar Kegiatan Ekskul */}
            {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Memuat data kegiatan...</div>
            ) : extracurriculars.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                    <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Belum ada kegiatan ekstrakurikuler</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Silakan tambahkan kegiatan ekskul baru melalui tombol di atas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {extracurriculars.map((ekskul) => (
                        <div 
                            key={ekskul.id} 
                            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-xs transition space-y-3 relative group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                                        {ekskul.name}
                                    </h3>
                                    <span className="text-[11px] text-blue-600 font-bold block mt-0.5">
                                        {ekskul.day_name} • {ekskul.start_time} - {ekskul.end_time}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleDelete(ekskul.id, ekskul.name)}
                                    className="text-slate-300 hover:text-rose-600 transition p-1 cursor-pointer"
                                    title="Hapus Ekstrakurikuler"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Guru Pembina Resmi Terdaftar */}
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {ekskul.mentor_full_name?.charAt(0) || ekskul.mentor_name?.charAt(0) || 'G'}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                        Guru Pembina Resmi
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate block">
                                        {ekskul.mentor_full_name || ekskul.mentor_name || 'Belum ditentukan'}
                                    </span>
                                </div>
                            </div>

                            {/* Lokasi & Jumlah Anggota */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span className="flex items-center gap-1 truncate max-w-[150px]">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{ekskul.location || 'Sekolah'}</span>
                                </span>
                                <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                    {ekskul.total_members || 0} Siswa
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL TAMBAH EKSKUL */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900">
                                Tambah Ekstrakurikuler
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Nama Kegiatan *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Pramuka, Futsal, PMR"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-blue-500"
                                />
                            </div>

                            {/* PILIH GURU PEMBINA DARI GURU TERDAFTAR */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Pilih Guru Pembina (Dari Guru Terdaftar) *
                                </label>
                                <select
                                    required
                                    value={mentorTeacherId}
                                    onChange={(e) => setMentorTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-blue-500"
                                >
                                    <option value="">-- Pilih Guru Pembina --</option>
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.full_name} ({t.nip ? `NIP: ${t.nip}` : 'Guru'})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Hanya guru yang dipilih ini yang berhak menginput absensi sesi kegiatan ini.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Hari Pelaksanaan *</label>
                                    <select
                                        value={dayName}
                                        onChange={(e) => setDayName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-blue-500"
                                    >
                                        <option value="Senin">Senin</option>
                                        <option value="Selasa">Selasa</option>
                                        <option value="Rabu">Rabu</option>
                                        <option value="Kamis">Kamis</option>
                                        <option value="Jumat">Jumat</option>
                                        <option value="Sabtu">Sabtu</option>
                                        <option value="Minggu">Minggu</option>
                                        <option value="Rabu & Sabtu">Rabu & Sabtu</option>
                                        <option value="Jumat & Sabtu">Jumat & Sabtu</option>
                                        <option value="Selasa & Kamis">Selasa & Kamis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Lokasi Latihan</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Lapangan"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-sm cursor-pointer"
                                >
                                    Simpan Ekskul
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
