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
    const [cleaningDemo, setCleaningDemo] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusDialog, setStatusDialog] = useState(null);

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

    const handleCleanupDemoData = async () => {
        const confirmed = window.confirm('Hapus hanya data contoh bawaan Portal yang dikenali (siswa BC-1001–BC-1005, guru guru.budi/guru.siti/guru.hendra, dan ekskul contoh)? Data lain tidak disentuh. Pastikan database sudah dicadangkan.');
        if (!confirmed) return;
        setCleaningDemo(true);
        setStatusMessage('');
        setStatusDialog({ type: 'progress', message: 'Membersihkan data contoh…' });
        try {
            const res = await authFetch('/api/admin/cleanup-demo-data', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(data.message || 'Data contoh berhasil dibersihkan.');
                setStatusDialog({ type: 'success', message: data.message || 'Data contoh berhasil dibersihkan.' });
            } else {
                setStatusDialog({ type: 'error', message: data.message || 'Gagal membersihkan data contoh.' });
            }
        } catch {
            setStatusDialog({ type: 'error', message: 'Gagal menghubungi server untuk membersihkan data contoh.' });
        } finally {
            setCleaningDemo(false);
        }
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
                setStatusDialog({ type: 'success', message: data.message || 'Sinkronisasi dengan Nebula Presence berhasil!' });
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xs">
                <div className="max-w-2xl">
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-200 block mb-1">
                        Koneksi Aplikasi Absensi
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Secret Token & Gateway Sinkronisasi
                    </h2>
                    <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
                        Salin Secret Token dan URL Gateway ini ke aplikasi absensi desktop lokal untuk menghubungkan pengiriman data scan absensi secara otomatis.
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
                            <p className="text-xs text-slate-500">Token acak unik untuk keamanan komunikasi antar-sistem</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCleanupDemoData}
                            disabled={cleaningDemo}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            title="Hapus hanya data contoh bawaan yang dikenali"
                        >
                            <span>{cleaningDemo ? 'Membersihkan...' : 'Bersihkan Data Contoh'}</span>
                        </button>
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
                        Token ini dihasilkan secara acak melalui cryptographic hash sehingga setiap sekolah/instansi memiliki token yang berbeda dan aman.
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
            {statusDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-live="polite">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                {statusDialog.type === 'progress' ? <RefreshCw className="mt-0.5 h-6 w-6 animate-spin text-blue-600" /> : statusDialog.type === 'success' ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-6 w-6 text-rose-600" />}
                                <div><h3 className="font-bold text-slate-900">{statusDialog.type === 'progress' ? 'Sedang Diproses' : statusDialog.type === 'success' ? 'Berhasil' : 'Terjadi Kesalahan'}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{statusDialog.message}</p></div>
                            </div>
                            {statusDialog.type !== 'progress' && <button onClick={() => setStatusDialog(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Tutup"><X className="h-4 w-4" /></button>}
                        </div>
                        {statusDialog.type === 'progress' && <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" /></div>}
                        {statusDialog.type !== 'progress' && <button onClick={() => setStatusDialog(null)} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Tutup</button>}
                    </div>
                </div>
            )}
        </div>
    );
}
