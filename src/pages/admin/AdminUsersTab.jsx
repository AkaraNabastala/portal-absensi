import React from 'react';
import { KeyRound, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { authFetch } from '../../utils/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

export default function AdminUsersTab() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState('ALL');
  const [busy, setBusy] = React.useState('');
  const [notice, setNotice] = React.useState(null);
  const [adminForm, setAdminForm] = React.useState({ username: '', currentPassword: '', newPassword: '' });
  const [forms, setForms] = React.useState({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Daftar pengguna gagal dimuat.');
      setUsers(data.data || []);
      setForms(prev => {
        const next = { ...prev };
        for (const user of (data.data || [])) {
          if (!next[`${user.user_type}-${user.id}`]) next[`${user.user_type}-${user.id}`] = { username: user.username || user.identifier || '', secret: '' };
        }
        return next;
      });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Tidak dapat memuat pengguna.' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadUsers(); }, []);

  React.useEffect(() => {
    let mounted = true;
    authFetch('/api/auth/me').then(res => res.json()).then(data => {
      if (mounted && data.success) setAdminForm(prev => ({ ...prev, username: data.user?.username || prev.username }));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const updateForm = (key, field, value) => setForms(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const saveAdminCredentials = async event => {
    event.preventDefault();
    setBusy('admin');
    setNotice(null);
    try {
      const res = await authFetch('/api/admin/account-credentials', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Perubahan akun admin gagal.');
      setAdminForm({ username: data.username || adminForm.username, currentPassword: '', newPassword: '' });
      setNotice({ type: 'success', text: data.message });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Perubahan akun admin gagal.' });
    } finally { setBusy(''); }
  };

  const saveCredentials = async user => {
    const key = `${user.user_type}-${user.id}`;
    const form = forms[key] || {};
    setBusy(key);
    setNotice(null);
    try {
      const res = await authFetch(`/api/admin/users/${user.user_type}/${user.id}/credentials`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user.user_type === 'TEACHER' ? { username: form.username, password: form.secret } : { password: form.secret })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Kredensial gagal diperbarui.');
      setNotice({ type: 'success', text: `${user.full_name}: ${data.message}` });
      setForms(prev => ({ ...prev, [key]: { ...prev[key], secret: '' } }));
      await loadUsers();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Kredensial gagal diperbarui.' });
    } finally { setBusy(''); }
  };

  const filtered = users.filter(user => {
    const matchesKind = kind === 'ALL' || user.user_type === kind;
    const text = [user.full_name, user.identifier, user.username, user.nipd, user.nisn, user.division, user.role].filter(Boolean).join(' ').toLowerCase();
    return matchesKind && text.includes(query.trim().toLowerCase());
  });

  return <div className="space-y-6">
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-100 p-3 text-sky-800"><Users size={22} /></span><div><h2 className="text-xl font-extrabold text-slate-900">Manajemen Users</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Kelola akun admin, guru, dan siswa di satu tempat. Password dan PIN tidak pernah ditampilkan kembali.</p></div></div>
        <button onClick={loadUsers} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Muat ulang</button>
      </div>
    </section>

    {notice && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-sky-700" /><h3 className="font-bold text-slate-900">Akun administrator Portal</h3></div>
      <p className="mt-1 text-sm text-slate-500">Username dapat diganti. Password saat ini diperlukan untuk memastikan perubahan dilakukan oleh pemilik akun.</p>
      <form onSubmit={saveAdminCredentials} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Username baru<input className={inputClass + ' mt-1'} autoComplete="username" minLength={3} maxLength={80} required value={adminForm.username} onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))} /></label>
        <label className="text-sm font-semibold text-slate-700">Password saat ini<input className={inputClass + ' mt-1'} type="password" autoComplete="current-password" required value={adminForm.currentPassword} onChange={e => setAdminForm(p => ({ ...p, currentPassword: e.target.value }))} /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Password baru (minimal 12 karakter)<input className={inputClass + ' mt-1'} type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={adminForm.newPassword} onChange={e => setAdminForm(p => ({ ...p, newPassword: e.target.value }))} /></label>
        <div className="md:col-span-2"><button disabled={busy === 'admin'} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><KeyRound size={16} />{busy === 'admin' ? 'Menyimpan…' : 'Simpan kredensial admin'}</button></div>
      </form>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h3 className="font-bold text-slate-900">Daftar pengguna</h3><p className="mt-1 text-sm text-slate-500">{filtered.length} akun ditampilkan · identitas tetap digunakan untuk relasi presensi</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className={inputClass + ' pl-9'} placeholder="Cari nama / identitas…" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <select className={inputClass + ' sm:w-40'} value={kind} onChange={e => setKind(e.target.value)}><option value="ALL">Semua akun</option><option value="TEACHER">Guru / tendik</option><option value="STUDENT">Siswa</option></select>
        </div>
      </div>
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Memuat pengguna…</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Tidak ada pengguna yang cocok.</p> :
        <div className="mt-4 space-y-3">{filtered.map(user => {
          const key = `${user.user_type}-${user.id}`;
          const form = forms[key] || { username: user.username || user.identifier || '', secret: '' };
          const teacher = user.user_type === 'TEACHER';
          return <article key={key} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">{user.full_name}</h4><p className="mt-1 text-xs text-slate-500">{teacher ? 'Guru / Tendik' : 'Siswa'} · ID: {user.identifier || '-'} · {user.division || 'Belum ada kelas'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.credential_configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{user.credential_configured ? 'Kredensial tersedia' : 'Belum ada kredensial'}</span></div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              {teacher ? <label className="text-xs font-bold text-slate-600">Username<input className={inputClass + ' mt-1'} minLength={3} maxLength={80} value={form.username || ''} onChange={e => updateForm(key, 'username', e.target.value)} /></label> : <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><strong>Username awal:</strong> NISN/NIPD<br/><span>Gunakan identitas ini untuk login siswa.</span></div>}
              <label className="text-xs font-bold text-slate-600">{teacher ? 'Password baru (min. 12 karakter)' : 'PIN baru (6–12 digit)'}<input className={inputClass + ' mt-1'} type="password" inputMode={teacher ? 'text' : 'numeric'} minLength={teacher ? 12 : 6} maxLength={teacher ? 200 : 12} value={form.secret || ''} onChange={e => updateForm(key, 'secret', e.target.value)} placeholder={teacher ? 'Masukkan password baru' : 'Masukkan PIN pribadi'} /></label>
              <button disabled={busy === key || !form.secret || (teacher && !form.username)} onClick={() => saveCredentials(user)} className="self-end inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><KeyRound size={15} />{busy === key ? 'Menyimpan…' : 'Atur kredensial'}</button>
            </div>
          </article>;
        })}</div>}
    </section>
  </div>;
}
