import React, { useState } from 'react';
import { Sliders, KeyRound, CheckCircle, ShieldAlert } from 'lucide-react';

export default function DeveloperModal({ onClose }) {
    const [masterKey, setMasterKey] = useState('');
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');

    const handleDevAuth = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/dev/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterKey })
            });
            const data = await res.json();
            if (data.success) {
                setSettings(data.settings);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Gagal menghubungi server developer.');
        }
    };

    const handleUpdateLicense = async (newStatus) => {
        try {
            await fetch('/api/dev/update-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterKey,
                    licenseStatus: newStatus,
                    licenseKey: settings.license_key,
                    syncSecret: settings.sync_secret
                })
            });
            setSettings({ ...settings, license_status: newStatus });
            alert(`Lisensi diperbarui ke: ${newStatus}`);
        } catch (err) {
            alert('Gagal update lisensi.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
                >
                    ✕
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Developer God Mode</h3>
                        <p className="text-xs text-slate-400">Kontrol Lisensi & Kunci Sinkronisasi Desktop-Web</p>
                    </div>
                </div>

                {!settings ? (
                    <form onSubmit={handleDevAuth} className="space-y-4">
                        {error && <div className="text-xs text-rose-400">{error}</div>}
                        <div>
                            <label className="block text-xs text-slate-300 mb-1">Developer Master Key</label>
                            <input
                                type="password"
                                required
                                value={masterKey}
                                onChange={(e) => setMasterKey(e.target.value)}
                                placeholder="Masukkan DEV-MASTER-999"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer transition"
                        >
                            Buka Akses Master
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4 text-xs">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Status Lisensi:</span>
                                <span className="font-bold text-emerald-400">{settings.license_status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Token Sync Rahasia:</span>
                                <span className="font-mono text-cyan-400">{settings.sync_secret}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">License Key:</span>
                                <span className="font-mono text-slate-300">{settings.license_key}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-300 mb-1.5 font-medium">Ubah Status Lisensi Sistem:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateLicense('ACTIVE')}
                                    className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl cursor-pointer"
                                >
                                    ACTIVE
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateLicense('TRIAL')}
                                    className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 py-2 rounded-xl cursor-pointer"
                                >
                                    TRIAL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateLicense('SUSPENDED')}
                                    className="bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 py-2 rounded-xl cursor-pointer"
                                >
                                    SUSPENDED
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateLicense('EXPIRED')}
                                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 py-2 rounded-xl cursor-pointer"
                                >
                                    EXPIRED
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
