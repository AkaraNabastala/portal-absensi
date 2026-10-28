import React from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { authFetch } from '../../utils/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

export default function AdminProfileTab({ currentUser }) {
  const [form, setForm] = React.useState({ username: currentUser?.username || '', currentPassword: '', newPassword: '' });
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    authFetch('/api/auth/me').then(res => res.json()).then(data => {
      if (mounted && data.success) setForm(prev => ({ ...prev, username: data.user?.username || prev.username }));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const save = async event => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/admin/account-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Perubahan profil admin gagal disimpan.');
      setForm({ username: data.username || form.username, currentPassword: '', newPassword: '' });
      setNotice({ type: 'success', text: data.message || 'Profil administrator berhasil diperbarui.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Perubahan profil admin gagal disimpan.' });
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-sky-100 p-3 text-sky-800"><UserRound size={22} /></span>
        <div><h2 className="text-xl font-extrabold text-slate-900">Profil Administrator</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Kelola identitas login admin Portal secara terpisah dari daftar guru dan siswa. Perubahan username hanya dapat dilakukan oleh admin yang sedang login.</p></div>
      </div>
    </section>
    {notice && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-sky-700" /><h3 className="font-bold text-slate-900">Keamanan akun</h3></div>
      <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Username administrator<input className={inputClass + ' mt-1'} autoComplete="username" minLength={3} maxLength={80} required value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} /></label>
        <label className="text-sm font-semibold text-slate-700">Password saat ini<input className={inputClass + ' mt-1'} type="password" autoComplete="current-password" required value={form.currentPassword} onChange={e => setForm(prev => ({ ...prev, currentPassword: e.target.value }))} /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Password baru (minimal 12 karakter)<input className={inputClass + ' mt-1'} type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={form.newPassword} onChange={e => setForm(prev => ({ ...prev, newPassword: e.target.value }))} /></label>
        <div className="md:col-span-2"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><KeyRound size={16} />{busy ? 'Menyimpan…' : 'Simpan profil dan kredensial'}</button></div>
      </form>
    </section>
  </div>;
}
