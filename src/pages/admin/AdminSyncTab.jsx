import React, { useState, useEffect } from 'react';
import { 
    KeyRound, 
    RefreshCw, 
    Copy, 
    Check, 
    ShieldCheck,
    Globe
} from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function AdminSyncTab({ settings: propSettings, onSettingsChange }) {
    const [localSettings, setLocalSettings] = useState(propSettings || {});
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [syncingNow, setSyncingNow] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

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
                setTimeout(() => setStatusMessage(''), 4000);
            } else {
                alert(data.message || 'Gagal sinkronisasi.');
            }
        } catch {
            alert('Gagal menghubungi server.');
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
                            value={activeSettings?.sync_secret || 'SEC-NEBULA-SYNC-KEY-2026'}
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
        </div>
    );
}
