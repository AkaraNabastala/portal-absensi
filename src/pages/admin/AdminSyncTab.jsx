import React, { useState } from 'react';
import { 
    KeyRound, 
    RefreshCw, 
    Copy, 
    Check, 
    ShieldCheck,
    Globe
} from 'lucide-react';

export default function AdminSyncTab({ settings, onSettingsChange }) {
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const gatewayUrl = `${origin}/api/sync/push-attendance`;

    const handleCopyToken = () => {
        if (settings?.sync_secret) {
            navigator.clipboard.writeText(settings.sync_secret);
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(gatewayUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleGenerateRandomToken = async () => {
        if (!confirm('Apakah Anda yakin ingin membuat Secret Token baru? Token lama akan kedaluwarsa dan Anda harus memasukkan token baru ini ke aplikasi desktop.')) {
            return;
        }

        setGeneratingToken(true);
        setStatusMessage('');

        try {
            const res = await fetch('/api/admin/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123',
                    masterKey: 'DEV-MASTER-999'
                })
            });

            const data = await res.json();
            if (data.success) {
                if (onSettingsChange) onSettingsChange({ ...settings, sync_secret: data.sync_secret });
                setStatusMessage('Secret Token acak baru berhasil digenerate!');
                setTimeout(() => setStatusMessage(''), 4000);
            } else {
                alert(data.message || 'Gagal generate token.');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat menghubungi server.');
        } finally {
            setGeneratingToken(false);
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

                    <button
                        onClick={handleGenerateRandomToken}
                        disabled={generatingToken}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        title="Buat token acak baru"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${generatingToken ? 'animate-spin text-blue-600' : ''}`} />
                        <span>{generatingToken ? 'Membuat...' : 'Acak Token'}</span>
                    </button>
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
                            value={settings?.sync_secret || ''}
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
