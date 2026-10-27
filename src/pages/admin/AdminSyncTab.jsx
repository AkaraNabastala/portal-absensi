import React, { useState, useEffect } from 'react';
import { 
    KeyRound, 
    RefreshCw, 
    Copy, 
    Check, 
    ShieldCheck,
    Globe,
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function AdminSyncTab({ settings: propSettings, onSettingsChange }) {
    const [localSettings, setLocalSettings] = useState(propSettings || {});
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [syncingNow, setSyncingNow] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusDialog, setStatusDialog] = useState(null);
    const [pinMemberIdentifier, setPinMemberIdentifier] = useState('');
    const [newParentPin, setNewParentPin] = useState('');
    const [savingParentPin, setSavingParentPin] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const gatewayUrl = `${origin}/api/sync`;

    const loadLiveSettings = async () => {
        try {
            const res = await authFetch('/api/admin/settings');
            const data = await res.json();
            if (data.success && data.settings) {
                setLocalSettings(data.settings);
                if (onSettingsChange) onSettingsChange(data.settings);
            }
        } catch (e) {
            console.error('Error load live sync settings:', e);
        }
    };

    useEffect(() => {
        loadLiveSettings();
    }, []);

    const activeSettings = localSettings?.sync_secret ? localSettings : propSettings;

    const handleCopyToken = () => {
        if (activeSettings?.sync_secret) {
            navigator.clipboard.writeText(activeSettings.sync_secret);
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(gatewayUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleTriggerDirectSync = async () => {
        setSyncingNow(true);
        setStatusMessage('');
        setStatusDialog({ type: 'progress', message: 'Menghubungkan Portal dengan Nebula Presence…' });
        try {
            const res = await authFetch('/api/admin/trigger-direct-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                if (data.settings) {
                    setLocalSettings(data.settings);
                    if (onSettingsChange) onSettingsChange(data.settings);
                }
                setStatusMessage(data.message || 'Sinkronisasi dengan Nebula Presence berhasil!');
                setStatusDialog({ type: Array.isArray(data.errors) && data.errors.length ? 'error' : 'success', message: data.message || 'Sinkronisasi dengan Nebula Presence selesai.', errors: data.errors || [] });
                setTimeout(() => setStatusMessage(''), 4000);
            } else {
                setStatusDialog({ type: 'error', message: data.message || 'Gagal sinkronisasi.' });
            }
        } catch {
            setStatusDialog({ type: 'error', message: 'Gagal menghubungi server.' });
        } finally {
            setSyncingNow(false);
        }
    };

    const handleSetParentPin = async (event) => {
        event.preventDefault();
        if (!pinMemberIdentifier.trim() || !newParentPin) return;
        setSavingParentPin(true);
        try {
            const endpoint = '/api/admin/members/' + encodeURIComponent(pinMemberIdentifier.trim()) + '/parent-pin';
            const res = await authFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: newParentPin })
            });
            const data = await res.json();
            setStatusDialog({
                type: res.ok && data.success ? 'success' : 'error',
                message: data.message || (res.ok ? 'PIN berhasil diperbarui.' : 'Gagal memperbarui PIN.')
            });
            if (res.ok && data.success) {
                setPinMemberIdentifier('');
                setNewParentPin('');
            }
        } catch {
            setStatusDialog({ type: 'error', message: 'Tidak dapat menghubungi server untuk memperbarui PIN.' });
        } finally {
            setSavingParentPin(false);
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

            {/* Banner Sinkronisasi */}
            <div className="bg-gradient-to-br from-slate-950 via-blue-900 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xs">
                <div className="max-w-2xl">
                    <span className="text-xs uppercase font-bold tracking-wider text-sky-200 block mb-1">
                        Koneksi Aplikasi Absensi
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Secret Token & Gateway Sinkronisasi
                    </h2>
                    <p className="text-xs sm:text-sm text-sky-100 mt-2 leading-relaxed">
                        Gunakan URL dan token ini untuk menghubungkan Portal dengan Nebula Presence.
                    </p>
                </div>
            </div>

            {/* Kotak Pengaturan Token */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">Secret Token / API Key</h3>
                            <p className="text-xs text-slate-500">Token koneksi antar-aplikasi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleTriggerDirectSync}
                            disabled={syncingNow}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                            title="Tarik data terbaru dari Nebula Presence lokal"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                            <span>{syncingNow ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
                        </button>
                    </div>
                </div>

                {/* Display Token */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Token Rahasia Saat Ini
                    </label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            readOnly
                            value={activeSettings?.sync_secret || ''}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 pr-24 font-mono text-xs sm:text-sm font-bold text-slate-800 select-all focus:outline-none"
                        />
                        <button
                            onClick={handleCopyToken}
                            className="absolute right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                            {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedToken ? 'Disalin' : 'Salin'}</span>
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                        Jaga token ini tetap rahasia.
                    </p>
                </div>

                {/* Display URL Gateway */}
                <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        URL Gateway Sinkronisasi
                    </label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            readOnly
                            value={gatewayUrl}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 pr-24 font-mono text-xs sm:text-sm font-bold text-slate-800 select-all focus:outline-none"
                        />
                        <button
                            onClick={handleCopyUrl}
                            className="absolute right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedUrl ? 'Disalin' : 'Salin'}</span>
                        </button>
                    </div>
                </div>
            </div>
            {/* Pengelolaan PIN akun siswa/wali */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl"><KeyRound className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">Atur PIN Siswa / Wali</h3>
                        <p className="text-xs text-slate-500">Tetapkan PIN pribadi; sistem tidak lagi menggunakan PIN bawaan.</p>
                    </div>
                </div>
                <form onSubmit={handleSetParentPin} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div>
                        <label htmlFor="parent-pin-member" className="block text-xs font-bold text-slate-600 mb-2">ID anggota, NISN, atau NIPD</label>
                        <input id="parent-pin-member" value={pinMemberIdentifier} onChange={(event) => setPinMemberIdentifier(event.target.value)} autoComplete="off" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Masukkan ID siswa" />
                    </div>
                    <div>
                        <label htmlFor="parent-pin-value" className="block text-xs font-bold text-slate-600 mb-2">PIN baru (6–12 digit)</label>
                        <input id="parent-pin-value" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6,12}" maxLength={12} value={newParentPin} onChange={(event) => setNewParentPin(event.target.value.replace(/\D/g, '').slice(0, 12))} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="PIN pribadi" />
                    </div>
                    <button type="submit" disabled={savingParentPin || !pinMemberIdentifier.trim() || newParentPin.length < 6} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                        {savingParentPin ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {savingParentPin ? 'Menyimpan…' : 'Simpan PIN'}
                    </button>
                </form>
                <p className="text-[11px] text-slate-500">PIN bawaan dan pola yang mudah ditebak ditolak. Sampaikan PIN baru secara privat kepada wali/siswa yang bersangkutan.</p>
            </div>
            {statusDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-live="polite">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                {statusDialog.type === 'progress' ? <RefreshCw className="mt-0.5 h-6 w-6 animate-spin text-blue-600" /> : statusDialog.type === 'success' ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-6 w-6 text-rose-600" />}
                                <div><h3 className="font-bold text-slate-900">{statusDialog.type === 'progress' ? 'Sedang Diproses' : statusDialog.type === 'success' ? 'Berhasil' : 'Perlu Diperiksa'}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{statusDialog.message}</p>{Array.isArray(statusDialog.errors) && statusDialog.errors.length > 0 && <ul className="mt-3 max-h-32 list-disc space-y-1 overflow-auto pl-5 text-xs text-rose-700">{statusDialog.errors.slice(0, 6).map((error, index) => <li key={index}>{String(error)}</li>)}</ul>}</div>
                            </div>
                            {statusDialog.type !== 'progress' && <button onClick={() => setStatusDialog(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Tutup"><X className="h-4 w-4" /></button>}
                        </div>
                        {statusDialog.type === 'progress' && <><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full animate-pulse rounded-full bg-blue-600/60" /></div><p className="mt-2 text-xs text-slate-500">Menunggu respons server. Persentase progres tidak ditampilkan karena server belum menyediakan data progres bertahap.</p></>}
                        {statusDialog.type !== 'progress' && <button onClick={() => setStatusDialog(null)} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Tutup</button>}
                    </div>
                </div>
            )}
        </div>
    );
}
