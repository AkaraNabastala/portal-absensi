import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import nabastalaLogo from '../assets/logo-nabastala.png';
import { toast } from 'react-toastify';

export default function LoginPage({ onLoginSuccess }) {
    const [identifier, setIdentifier] = useState('');
    const [secret, setSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [schoolInfo, setSchoolInfo] = useState({
        school_name: 'NEBULA PRESENCE',
        isConnected: false
    });

    useEffect(() => {
        fetch('/api/portal/info')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setSchoolInfo(res.data);
            })
            .catch(() => { });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, secret })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Berhasil masuk ke Portal.');
                onLoginSuccess(data.user, data.token);
            } else {
                toast.error(data.message || 'ID atau Kata Sandi salah.');
            }
        } catch (err) {
            toast.error('Gagal menghubungi server. Periksa koneksi Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#07152f] via-blue-800 to-sky-600 flex items-center justify-center p-4 sm:p-8 font-sans antialiased selection:bg-blue-500 selection:text-white">

            {/* Container Utama (Card Split Screen Desktop / Stacked Mobile) */}
            <div className="w-full max-w-4xl bg-white rounded-[1.75rem] sm:rounded-[2.25rem] shadow-[0_28px_90px_rgba(3,12,30,0.38)] border border-white/20 overflow-hidden grid grid-cols-1 md:grid-cols-2 relative transition-all duration-300">

                {/* ======================================================== */}
                {/* SISI KIRI: BRANDING ROYAL BLUE DENGAN BOLA 3D ELEGAN     */}
                {/* ======================================================== */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden min-h-[260px] md:min-h-[540px]">

                    {/* Abstract 3D Spheres (Persis Referensi Gambar 1 & 2) */}
                    <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-gradient-to-br from-blue-400/40 via-blue-300/20 to-transparent blur-xs pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-tl from-indigo-950 via-blue-700 to-blue-500/80 pointer-events-none shadow-2xl shadow-black/50" />
                    <div className="absolute bottom-12 left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-blue-400/70 via-blue-500/50 to-cyan-300/40 pointer-events-none shadow-[0_15px_35px_rgba(0,0,0,0.25)]" />
                    <div className="absolute top-1/2 -right-8 w-24 h-24 rounded-full bg-blue-500/40 blur-md pointer-events-none" />

                    {/* Header Brand */}
                    <div className="relative z-10">
                        {/* Logo Murni Tanpa Background / Border Kotak */}
                        <div className="mb-5">
                            <img
                                src={schoolInfo.school_logo || nabastalaLogo}
                                alt="Logo Instansi"
                                className="w-16 h-16 object-contain drop-shadow"
                                onError={(e) => { e.currentTarget.src = nabastalaLogo; }}
                            />
                        </div>

                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-blue-200 block mb-1">
                            Portal Presensi Terpadu
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            WELCOME
                        </h1>
                        <p className="text-sm font-bold text-blue-100 tracking-wide mt-1.5 flex flex-col">
                            <span>{schoolInfo.school_name || 'NEBULA PRESENCE'}</span>
                            {schoolInfo.school_address && (
                                <span className="text-xs text-blue-200/90 font-normal mt-1">{schoolInfo.school_address}</span>
                            )}
                        </p>
                    </div>

                    {/* Deskripsi Singkat di Layar Desktop */}
                    <div className="relative z-10 hidden md:block pt-6">
                        <p className="text-sm text-blue-100/90 leading-relaxed max-w-xs">
                            Sistem presensi kehadiran siswa & pemantauan kedisiplinan sekolah berbasis cloud terintegrasi.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                            <span className={`w-2 h-2 rounded-full ${schoolInfo.isConnected ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
                            <span className="text-xs font-medium text-blue-100">
                                {schoolInfo.isConnected ? 'Gateway Sinkron Aktif' : 'Portal Presensi Sekolah'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* SISI KANAN: FORMULIR SIGN IN MODERN & BERSIH             */}
                {/* ======================================================== */}
                <div className="bg-white p-8 sm:p-12 flex flex-col justify-center text-slate-800">

                    <div className="mb-6">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                            Sign In
                        </h2>
                    </div>

                    {error && (
                        <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2.5 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span className="font-medium leading-tight">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Input 1: NISN / NIP */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 tracking-wide">
                                ID
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="Masukan ID Anda"
                                    className="w-full bg-[#F4F6FB] hover:bg-slate-100/90 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-medium"
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-blue-600 transition-colors" />
                            </div>
                        </div>

                        {/* Input 2: NIPD / Sandi */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 tracking-wide">
                                Password
                            </label>
                            <div className="relative group">
                                <input
                                    type={showSecret ? 'text' : 'password'}
                                    required
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    placeholder="Masukan Password Anda"
                                    className="w-full bg-[#F4F6FB] hover:bg-slate-100/90 focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-11 pr-16 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-mono"
                                />
                                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-blue-600 transition-colors" />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold tracking-wider text-slate-500 hover:text-blue-600 transition cursor-pointer select-none"
                                >
                                    {showSecret ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me Option */}
                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800 transition">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="font-medium text-xs sm:text-sm">Ingat Saya</span>
                            </label>
                            <span className="text-xs text-slate-400 font-medium">
                                Pusat Bantuan
                            </span>
                        </div>

                        {/* Tombol Utama Sign In */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Card */}
                    <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Nebula Presence</span>
                        <span>Developed by Nabastala</span>
                    </div>

                </div>

            </div>
        </div>
    );
}
