import React from 'react';
import { Download, FileSpreadsheet, KeyRound, RefreshCw, Search, Upload, Users } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { authFetch } from '../../utils/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

export default function AdminUsersTab() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState('ALL');
  const [busy, setBusy] = React.useState('');
  const [notice, setNotice] = React.useState(null);
  const [forms, setForms] = React.useState({});
  const [profileForms, setProfileForms] = React.useState({});
  const [profileOpen, setProfileOpen] = React.useState({});
  const [importing, setImporting] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState(null);
  const [pendingImport, setPendingImport] = React.useState(null);
  const importInput = React.useRef(null);

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
          const key = `${user.user_type}-${user.id}`;
          next[key] = { username: user.username || (user.user_type === 'TEACHER' ? user.identifier || '' : ''), secret: prev[key]?.secret || '' };
        }
        return next;
      });
      setProfileForms(prev => {
        const next = { ...prev };
        for (const user of (data.data || [])) {
          const key = `${user.user_type}-${user.id}`;
          next[key] = {
            full_name: user.full_name || '', nip: user.nip || '', nik: user.nik || '',
            nisn: user.nisn || '', nipd: user.nipd || '', barcode_id: user.barcode_id || '',
            gender: user.gender || 'L', division: user.division || '', address: user.address || '',
            email: user.email || '', birth_date: user.birth_date || '', phone_number: user.phone_number || '',
            parent_name: user.parent_name || '', parent_phone: user.parent_phone || ''
          };
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

  const updateForm = (key, field, value) => setForms(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const saveCredentials = async user => {
    const key = `${user.user_type}-${user.id}`;
    const form = forms[key] || {};
    setBusy(key);
    setNotice(null);
    try {
      const res = await authFetch(`/api/admin/users/${user.user_type}/${user.id}/credentials`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.secret })
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

  const exportExcel = () => {
    const columns = ['user_type','full_name','nip','nik','username','division','phone_number','address','email','birth_date','nisn','nipd','barcode_id','gender','parent_name','parent_phone','role','status'];
    const rows = users.map(user => Object.fromEntries(columns.map(column => [column, user[column] ?? (column === 'user_type' ? user.user_type : '')])));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    sheet['!cols'] = columns.map(column => ({ wch: Math.max(14, Math.min(28, column.length + 4)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Users');
    XLSX.writeFile(workbook, `nebula-users-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const columns = ['user_type','full_name','nip','nik','username','division','phone_number','address','email','birth_date','nisn','nipd','barcode_id','gender','parent_name','parent_phone','role'];
    const examples = [
      { user_type: 'TEACHER', full_name: 'Nama Guru', nip: 'NIP-GURU', username: 'NIP-GURU', division: 'X RPL 1', role: 'GURU' },
      { user_type: 'STUDENT', full_name: 'Nama Siswa', nisn: 'NISN-SISWA', nipd: 'NIPD-SISWA', division: 'X RPL 1', gender: 'L', role: 'siswa' }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(examples, { header: columns }), 'Template Users');
    XLSX.writeFile(workbook, 'template-import-users.xlsx');
  };

  const importExcel = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setNotice({ type: 'error', text: 'Pilih file Excel .xlsx atau .xls.' });
      return;
    }
    setImporting(true);
    setNotice(null);
    setImportSummary(null);
    setPendingImport(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('Workbook tidak memiliki lembar kerja.');
      const records = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
      if (!records.length) throw new Error('Lembar kerja tidak berisi baris data.');
      setPendingImport({ fileName: file.name, records });
      setNotice({ type: 'success', text: 'File Excel berhasil dibaca. Periksa pratinjau dan konfirmasi sebelum data disimpan.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'File Excel gagal dibaca.' });
    } finally { setImporting(false); }
  };

  const confirmImport = async () => {
    if (!pendingImport || importing) return;
    setImporting(true);
    setNotice(null);
    try {
      const res = await authFetch('/api/admin/users/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: pendingImport.records })
      });
      const data = await res.json();
      if (!res.ok || !data.result) throw new Error(data.message || 'Import Excel gagal diproses.');
      setImportSummary(data.result);
      setNotice({ type: data.result.failed ? 'error' : 'success', text: data.message || 'Import selesai.' });
      setPendingImport(null);
      await loadUsers();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Import Excel gagal diproses.' });
    } finally { setImporting(false); }
  };

  const updateProfileForm = (key, field, value) => setProfileForms(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const saveProfile = async user => {
    const key = `${user.user_type}-${user.id}`;
    setBusy(`profile-${key}`);
    setNotice(null);
    try {
      const res = await authFetch(`/api/admin/users/${user.user_type}/${user.id}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForms[key] || {})
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Biodata gagal disimpan.');
      setNotice({ type: 'success', text: `${user.full_name}: ${data.message}` });
      await loadUsers();
      setProfileOpen(prev => ({ ...prev, [key]: false }));
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Biodata gagal disimpan.' });
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
        <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-100 p-3 text-sky-800"><Users size={22} /></span><div><h2 className="text-xl font-extrabold text-slate-900">Manajemen Users</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Kelola data guru dan siswa. Username login dikelola admin dan terpisah dari NIP, NIPD, atau NISN.</p></div></div>
        <button onClick={loadUsers} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Muat ulang</button>
      </div>
    </section>

    {notice && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}
    {pendingImport && <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold">Pratinjau import Excel</h3><p className="mt-1 text-xs text-slate-600">{pendingImport.fileName} · {pendingImport.records.length} baris. Tidak ada password/PIN yang diimpor.</p></div><div className="flex gap-2"><button type="button" onClick={() => setPendingImport(null)} disabled={importing} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold">Batal</button><button type="button" onClick={confirmImport} disabled={importing} className="rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{importing ? 'Menyimpan…' : 'Konfirmasi import'}</button></div></div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-sky-100 bg-white"><table className="min-w-full text-left text-xs"><thead><tr>{Object.keys(pendingImport.records[0] || {}).slice(0,8).map(key => <th key={key} className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-bold">{key}</th>)}</tr></thead><tbody>{pendingImport.records.slice(0,5).map((row,index) => <tr key={index}>{Object.keys(pendingImport.records[0] || {}).slice(0,8).map(key => <td key={key} className="max-w-48 truncate border-b border-slate-50 px-3 py-2">{String(row[key] ?? '')}</td>)}</tr>)}</tbody></table></div>
      <p className="mt-2 text-[11px] text-slate-600">Hanya lima baris pertama ditampilkan di pratinjau; hasil lengkap beserta baris gagal akan dilaporkan setelah import.</p>
    </section>}
    {importSummary && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Ringkasan import:</strong> {importSummary.received} baris diterima · {importSummary.created} dibuat · {importSummary.updated} diperbarui · {importSummary.failed} gagal.
      {importSummary.errors?.length > 0 && <ul className="mt-2 max-h-40 list-inside list-disc overflow-auto text-xs text-rose-700">{importSummary.errors.slice(0, 20).map((error, index) => <li key={index}>Baris {error.row} ({error.name}): {error.message}</li>)}</ul>}
    </div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h3 className="font-bold text-slate-900">Daftar pengguna</h3><p className="mt-1 text-sm text-slate-500">{filtered.length} akun ditampilkan · identitas tetap digunakan untuk relasi presensi</p></div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><FileSpreadsheet size={15} /> Template Excel</button>
            <button type="button" onClick={exportExcel} disabled={!users.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 disabled:opacity-40"><Download size={15} /> Unduh data Excel</button>
            <input ref={importInput} type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel} />
            <button type="button" onClick={() => importInput.current?.click()} disabled={importing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Upload size={15} />{importing ? 'Mengimpor…' : 'Import Excel'}</button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className={inputClass + ' pl-9'} placeholder="Cari nama / identitas…" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <select className={inputClass + ' sm:w-40'} value={kind} onChange={e => setKind(e.target.value)}><option value="ALL">Semua akun</option><option value="TEACHER">Guru / tendik</option><option value="STUDENT">Siswa</option></select>
          </div>
        </div>
      </div>
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Memuat pengguna…</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Tidak ada pengguna yang cocok.</p> :
        <div className="mt-4 space-y-3">{filtered.map(user => {
          const key = `${user.user_type}-${user.id}`;
          const form = forms[key] || { username: user.username || (user.user_type === 'TEACHER' ? user.identifier || '' : ''), secret: '' };
          const teacher = user.user_type === 'TEACHER';
          return <article key={key} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">{user.full_name}</h4><p className="mt-1 text-xs text-slate-500">{teacher ? 'Guru / Tendik' : 'Siswa'} · ID: {user.identifier || '-'} · {user.division || 'Belum ada kelas'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.credential_configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{user.credential_configured ? 'Kredensial tersedia' : 'Belum ada kredensial'}</span></div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-bold text-slate-600">Username login<input className={inputClass + ' mt-1'} minLength={3} maxLength={80} autoComplete="off" value={form.username || ''} onChange={e => updateForm(key, 'username', e.target.value)} placeholder={teacher ? 'Username guru (bukan NIP)' : 'Username siswa (bukan NISN/NIPD)'} /></label>
              <label className="text-xs font-bold text-slate-600">Password baru (minimal 12 karakter)<input className={inputClass + ' mt-1'} type="password" autoComplete="new-password" minLength={12} maxLength={200} value={form.secret || ''} onChange={e => updateForm(key, 'secret', e.target.value)} placeholder="Buat password login baru" /></label>
              <button disabled={busy === key || !form.secret || !form.username || form.username.trim().length < 3} onClick={() => saveCredentials(user)} className="self-end inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><KeyRound size={15} />{busy === key ? 'Menyimpan…' : 'Atur login'}</button>
            </div>
            <button type="button" onClick={() => setProfileOpen(prev => ({ ...prev, [key]: !prev[key] }))} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{profileOpen[key] ? 'Tutup biodata' : 'Edit biodata lengkap'}</button>
            {profileOpen[key] && <div className="mt-3 rounded-xl bg-slate-50 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Nama lengkap<input className={inputClass + ' mt-1'} required value={profileForms[key]?.full_name || ''} onChange={e => updateProfileForm(key, 'full_name', e.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">Email<input className={inputClass + ' mt-1'} type="email" value={profileForms[key]?.email || ''} onChange={e => updateProfileForm(key, 'email', e.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">Tanggal lahir<input className={inputClass + ' mt-1'} type="date" value={profileForms[key]?.birth_date || ''} onChange={e => updateProfileForm(key, 'birth_date', e.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600">Nomor telepon<input className={inputClass + ' mt-1'} value={profileForms[key]?.phone_number || ''} onChange={e => updateProfileForm(key, 'phone_number', e.target.value)} /></label>
                <label className="text-xs font-bold text-slate-600 sm:col-span-2">Alamat lengkap<textarea className={inputClass + ' mt-1'} rows={2} value={profileForms[key]?.address || ''} onChange={e => updateProfileForm(key, 'address', e.target.value)} /></label>
                {teacher ? <>
                  <label className="text-xs font-bold text-slate-600">NIP / identitas guru<input className={inputClass + ' mt-1'} required value={profileForms[key]?.nip || ''} onChange={e => updateProfileForm(key, 'nip', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">NIK<input className={inputClass + ' mt-1'} value={profileForms[key]?.nik || ''} onChange={e => updateProfileForm(key, 'nik', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600 sm:col-span-2">Kelas binaan<input className={inputClass + ' mt-1'} value={profileForms[key]?.division || ''} onChange={e => updateProfileForm(key, 'division', e.target.value)} /></label>
                </> : <>
                  <label className="text-xs font-bold text-slate-600">NISN<input className={inputClass + ' mt-1'} value={profileForms[key]?.nisn || ''} onChange={e => updateProfileForm(key, 'nisn', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">NIPD<input className={inputClass + ' mt-1'} value={profileForms[key]?.nipd || ''} onChange={e => updateProfileForm(key, 'nipd', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">RFID / barcode<input className={inputClass + ' mt-1'} value={profileForms[key]?.barcode_id || ''} onChange={e => updateProfileForm(key, 'barcode_id', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">Jenis kelamin<select className={inputClass + ' mt-1'} value={profileForms[key]?.gender || 'L'} onChange={e => updateProfileForm(key, 'gender', e.target.value)}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
                  <label className="text-xs font-bold text-slate-600">Kelas<input className={inputClass + ' mt-1'} required value={profileForms[key]?.division || ''} onChange={e => updateProfileForm(key, 'division', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">Nama orang tua/wali<input className={inputClass + ' mt-1'} value={profileForms[key]?.parent_name || ''} onChange={e => updateProfileForm(key, 'parent_name', e.target.value)} /></label>
                  <label className="text-xs font-bold text-slate-600">Telepon orang tua/wali<input className={inputClass + ' mt-1'} value={profileForms[key]?.parent_phone || ''} onChange={e => updateProfileForm(key, 'parent_phone', e.target.value)} /></label>
                </>}
              </div>
              <button type="button" disabled={busy === `profile-${key}`} onClick={() => saveProfile(user)} className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy === `profile-${key}` ? 'Menyimpan biodata…' : 'Simpan biodata'}</button>
            </div>}
          </article>;
        })}</div>}
    </section>
  </div>;
}
