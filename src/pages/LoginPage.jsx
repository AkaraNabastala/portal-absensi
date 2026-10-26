import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import nabastalaLogo from '../assets/logo-nabastala.png';
import { toast } from 'react-toastify';

export default function LoginPage({ onLoginSuccess }) {
    const [identifier, setIdentifier] = useState('');
    const [secret, setSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);    const [loading, setLoading] = useState(false);

    const [schoolInfo, setSchoolInfo] = useState({
        school_name: 'NEBULA PRESENCE',
        isConnected: false
    });

    useEffect(() => {
        try {
            const savedIdentifier = localStorage.getItem('portal_remembered_identifier');
            if (savedIdentifier) {
                setIdentifier(savedIdentifier);
                setRememberMe(true);
            }
        } catch (_) {}

        fetch('/api/portal/info')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setSchoolInfo(res.data);
            })
            .catch(() => { });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (rememberMe) localStorage.setItem('portal_remembered_identifier', identifier.trim());
            else localStorage.removeItem('portal_remembered_identifier');
        } catch (_) {}
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
        <div className="min-h-screen bg-[#edf6fc] flex items-center justify-center p-4 sm:p-8 font-sans antialiased relative overflow-hidden selection:bg-sky-200 selection:text-[#14253b]">

            {/* Container Utama (Card Split Screen Desktop / Stacked Mobile) */}
            <div className="w-full max-w-5xl bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_24px_70px_rgba(20,37,59,.14)] border border-white overflow-hidden grid grid-cols-1 md:grid-cols-[.92fr_1.08fr] relative z-10">

                {/* ======================================================== */}
                {/* SISI KIRI: BRANDING ROYAL BLUE DENGAN BOLA 3D ELEGAN     */}
                {/* ======================================================== */}
                <div className="bg-[#14253b] p-7 sm:p-11 text-white flex flex-col justify-between relative overflow-hidden min-h-[240px] md:min-h-[570px]">

                    {/* Abstract 3D Spheres (Persis Referensi Gambar 1 & 2) */}
                    <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-sky-300/10 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-tl from-[#1c3854] via-[#284c69] to-[#f2a65a]/60 pointer-events-none shadow-2xl shadow-black/20" />
                    <div className="absolute bottom-12 left-10 w-32 h-32 rounded-full bg-gradient-to-tr from-[#f2a65a]/80 via-[#f7c88b]/40 to-sky-200/30 pointer-events-none shadow-[0_15px_35px_rgba(0,0,0,0.25)]" />
                    <div className="absolute top-1/2 -right-8 w-24 h-24 rounded-full bg-sky-300/20 blur-xl pointer-events-none" />
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-sky-300 via-[#f2a65a] to-transparent" />

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

                        <span className="text-xs uppercase tracking-[0.18em] font-bold text-sky-200 block mb-2">
                            Portal Presensi Terpadu
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            Selamat datang
                        </h1>
                        <p className="text-sm font-semibold text-sky-100 tracking-wide mt-2 flex flex-col">
                            <span>{schoolInfo.school_name || 'NEBULA PRESENCE'}</span>
                            {schoolInfo.school_address && (
                                <span className="text-xs text-sky-100/75 font-normal mt-1">{schoolInfo.school_address}</span>
                            )}
                        </p>
                    </div>

                    {/* Deskripsi Singkat di Layar Desktop */}
                    <div className="relative z-10 hidden md:block pt-6">
                        <p className="text-sm text-slate-200/90 leading-relaxed max-w-xs">
                            Sistem presensi kehadiran siswa & pemantauan kedisiplinan sekolah berbasis cloud terintegrasi.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/[0.07] backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                            <span className={`w-2 h-2 rounded-full ${schoolInfo.isConnected ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
                            <span className="text-xs font-medium text-slate-100">
                                {schoolInfo.isConnected ? 'Gateway Sinkron Aktif' : 'Portal Presensi Sekolah'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* SISI KANAN: FORMULIR SIGN IN MODERN & BERSIH             */}
                {/* ======================================================== */}
                <div className="bg-white p-7 sm:p-12 lg:p-14 flex flex-col justify-center text-slate-800">

                    <div className="mb-6">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14253b]">
                            Masuk ke akun
                        </h2>
                    </div>
<form onSubmit={handleSubmit} className="space-y-4">

                        {/* Input 1: NISN / NIP */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 tracking-wide">
                                ID Pengguna (NISN / NIP)
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="Masukkan NISN / NIP / ID Anda"
                                    className="w-full bg-[#f7fafc] hover:bg-sky-50 focus:bg-white border border-[#dce8f2] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-medium"
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-sky-700 transition-colors" />
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
                                    placeholder="Masukkan kata sandi"
                                    className="w-full bg-[#f7fafc] hover:bg-sky-50 focus:bg-white border border-[#dce8f2] focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl pl-11 pr-16 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-mono"
                                />
                                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-sky-700 transition-colors" />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold tracking-wider text-slate-500 hover:text-sky-700 transition cursor-pointer select-none"
                                >
                                    {showSecret ? 'SEMBUNYIKAN' : 'TAMPILKAN'}
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
                                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <span className="font-medium text-xs sm:text-sm">Ingat Saya</span>
                            </label>
                            <span className="text-xs text-slate-400 font-medium">
                                Pusat Bantuan
                            </span>
                        </div>

                        {/* Tombol utama autentikasi */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-[#176b9e] hover:bg-[#125980] active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-sky-900/15 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <>
                                    <span>Masuk</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Card */}
                    <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Nebula Presence</span>
                        <span>Dikembangkan oleh Nabastala</span>
                    </div>

                </div>

            </div>
        </div>
    );
}
