import React, { useEffect, useState } from 'react';
import {
    UserRound, Save, LoaderCircle, BadgeCheck, GraduationCap, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { authFetch } from '../../utils/api';

const fields = [
    { name: 'full_name', label: 'Nama lengkap siswa', type: 'text', required: true },
    { name: 'gender', label: 'Jenis kelamin', type: 'select', options: [['L', 'Laki-laki'], ['P', 'Perempuan']] },
    { name: 'birth_place', label: 'Tempat lahir', type: 'text' },
    { name: 'birth_date', label: 'Tanggal lahir', type: 'date' },
    { name: 'religion', label: 'Agama', type: 'select', options: [['', 'Pilih agama'], ['Islam', 'Islam'], ['Kristen', 'Kristen'], ['Katolik', 'Katolik'], ['Hindu', 'Hindu'], ['Buddha', 'Buddha'], ['Konghucu', 'Konghucu'], ['Lainnya', 'Lainnya']] },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone_number', label: 'Nomor HP siswa', type: 'tel' },
    { name: 'address', label: 'Alamat lengkap', type: 'textarea' },
    { name: 'nationality', label: 'Kewarganegaraan', type: 'text' },
    { name: 'child_order', label: 'Anak ke-', type: 'number', min: 1 },
    { name: 'siblings_count', label: 'Jumlah saudara kandung', type: 'number', min: 0 },
    { name: 'previous_school', label: 'Asal sekolah', type: 'text' },
    { name: 'admission_date', label: 'Tanggal masuk sekolah', type: 'date' },
    { name: 'parent_name', label: 'Nama orang tua / wali', type: 'text' },
    { name: 'parent_phone', label: 'Nomor HP orang tua', type: 'tel' },
    { name: 'guardian_name', label: 'Nama wali alternatif', type: 'text' },
    { name: 'guardian_relation', label: 'Hubungan dengan siswa', type: 'text' },
    { name: 'guardian_phone', label: 'Nomor HP wali alternatif', type: 'tel' }
];

const emptyForm = Object.fromEntries(fields.map(({ name }) => [name, '']));

export default function StudentProfileTab({ student = {}, onSaved }) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(Object.fromEntries(fields.map(({ name }) => [name, student?.[name] == null ? '' : String(student[name])])));
    }, [student?.id, student?.full_name, student?.gender, student?.birth_place, student?.birth_date, student?.religion, student?.email, student?.phone_number, student?.address, student?.nationality, student?.child_order, student?.siblings_count, student?.previous_school, student?.admission_date, student?.parent_name, student?.parent_phone, student?.guardian_name, student?.guardian_relation, student?.guardian_phone]);

    const update = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

    const saveProfile = async (event) => {
        event.preventDefault();
        if (!student?.id) {
            toast.error('Identitas siswa tidak ditemukan.');
            return;
        }
        if (!form.full_name.trim()) {
            toast.error('Nama lengkap wajib diisi.');
            return;
        }
        setSaving(true);
        try {
            const response = await authFetch(`/api/member/personal-details/${student.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    child_order: form.child_order === '' ? null : Number(form.child_order),
                    siblings_count: form.siblings_count === '' ? null : Number(form.siblings_count)
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Biodata gagal disimpan.');
            toast.success('Biodata siswa berhasil disimpan.');
            if (onSaved) onSaved();
        } catch (error) {
            toast.error(error.message || 'Tidak dapat menyimpan biodata.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
                    <div className="w-24 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-blue-50 shrink-0 relative flex items-center justify-center">
                        <span className="text-blue-700 text-4xl font-black">{student.full_name?.charAt(0) || 'S'}</span>
                        {student.photo_url && <img src={student.photo_url} alt={student.full_name || 'Foto siswa'} className="absolute inset-0 w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-700"><BadgeCheck className="w-3.5 h-3.5" /> Biodata Siswa</span>
                        <h2 className="text-2xl font-black text-slate-900 mt-2">{student.full_name || 'Profil Siswa'}</h2>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="text-xs bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1 font-semibold">NIPD: {student.nipd || '-'}</span>
                            <span className="text-xs bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1 font-semibold">NISN: {student.nisn || '-'}</span>
                            <span className="text-xs bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1 font-semibold inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Kelas: {student.division || '-'}</span>
                        </div>
                    </div>
                </div>
                <form onSubmit={saveProfile} className="pt-6">
                    <div className="flex items-center gap-2 mb-4"><UserRound className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-slate-900">Identitas, keluarga, dan riwayat pendidikan</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((field) => (
                            <label key={field.name} className={`block ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                                <span className="block text-xs font-bold text-slate-600 mb-1.5">{field.label}{field.required ? ' *' : ''}</span>
                                {field.type === 'textarea' ? (
                                    <textarea name={field.name} value={form[field.name]} onChange={update} rows={3} maxLength={2000} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Alamat sesuai domisili saat ini" />
                                ) : field.type === 'select' ? (
                                    <select name={field.name} value={form[field.name]} onChange={update} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                                        {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                ) : (
                                    <input name={field.name} type={field.type} value={form[field.name]} onChange={update} required={field.required} min={field.min} maxLength={field.type === 'date' || field.type === 'number' ? undefined : 180} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder={field.type === 'date' || field.type === 'number' ? undefined : `Masukkan ${field.label.toLowerCase()}`} />
                                )}
                            </label>
                        ))}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 md:col-span-2 flex gap-3 text-sm text-blue-900">
                            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                            <p>NISN, NIPD, kelas, dan data login dikelola melalui administrasi sekolah agar tidak berubah tanpa proses verifikasi.</p>
                        </div>
                    </div>
                    <div className="flex justify-end mt-5">
                        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-3 text-sm font-bold shadow-sm transition">
                            {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Menyimpan…' : 'Simpan Biodata'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
