import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Navbar from './components/Navbar';
import { authFetch } from './utils/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import WaliDashboard from './pages/wali/Dashboard';
import GuruDashboard from './pages/guru/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

// Komponen Pembungkus Portal Seragam (Admin, Guru, Siswa/Wali)
function PortalLayout({ currentUser, onLogout, schoolInfo }) {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return localStorage.getItem('portal_active_tab') || 'overview';
    } catch {
      return 'overview';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('portal_active_tab', tab);
    } catch (_) {}
  };
  const [parentData, setParentData] = useState(null);
  const [teacherSummary, setTeacherSummary] = useState(null);

  const fetchPersonalData = async (memberId, monthParam) => {
    try {
      const url = monthParam 
        ? `/api/member/personal-details/${memberId}?month=${monthParam}`
        : `/api/member/personal-details/${memberId}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setParentData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeacherClassData = async (division, monthParam) => {
    if (!division) return;
    try {
      const url = monthParam
        ? `/api/teacher/class-summary/${encodeURIComponent(division)}?month=${monthParam}`
        : `/api/teacher/class-summary/${encodeURIComponent(division)}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) setTeacherSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  const teacherId = currentUser?.teacher?.id;
  const teacherIsWali = currentUser?.teacher?.is_wali_kelas;
  const teacherCanManageClass = teacherIsWali || currentUser?.teacher?.is_penanggung_jawab;
  const teacherDiv = currentUser?.teacher?.assigned_division || currentUser?.teacher?.managed_divisions?.[0];
  const studentId = currentUser?.student?.id;
  const userRole = currentUser?.role;

  useEffect(() => {
    if (userRole === 'PARENT' && studentId) {
      fetchPersonalData(studentId);
    } else if (userRole === 'TEACHER') {
      if (teacherId) fetchPersonalData(teacherId);
      if (teacherCanManageClass && teacherDiv) fetchTeacherClassData(teacherDiv);
    }

    // Auto-refresh data setiap 10 detik agar kehadiran / scan RFID langsung terupdate di layar
    const interval = setInterval(() => {
      if (userRole === 'PARENT' && studentId) {
        fetchPersonalData(studentId);
      } else if (userRole === 'TEACHER') {
        if (teacherId) fetchPersonalData(teacherId);
        if (teacherCanManageClass && teacherDiv) fetchTeacherClassData(teacherDiv);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [userRole, studentId, teacherId, teacherCanManageClass, teacherDiv]);

  return (
    <div className="portal-sky-canvas min-h-screen bg-[#f4f8fc] text-slate-800 flex font-sans antialiased relative">
      {/* Desktop Sidebar (Seragam untuk Siswa, Guru, dan Admin) */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        schoolInfo={schoolInfo}
      />

      {/* Main Wrapper: Beri padding kiri md:pl-72 agar tidak tertutup Sidebar */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0 pb-28 md:pb-8">
        {/* Navbar Atas Desktop Breadcrumb */}
        <Navbar 
          currentUser={currentUser} 
          activeTab={activeTab} 
          onLogout={onLogout} 
          schoolInfo={schoolInfo} 
        />

        <main className="portal-content flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7">
          {currentUser.role === 'ADMIN' ? (
            <AdminDashboard
              currentUser={currentUser}
              initialSettings={currentUser.settings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              schoolInfo={schoolInfo}
            />
          ) : currentUser.role === 'PARENT' ? (
            <WaliDashboard
              student={currentUser.student}
              parentData={parentData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onRefresh={(month) => fetchPersonalData(currentUser.student.id, month)}
              schoolInfo={schoolInfo}
            />
          ) : (
            <GuruDashboard
              teacher={currentUser.teacher}
              personalData={parentData}
              teacherSummary={teacherSummary}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onRefreshPersonal={(month) => fetchPersonalData(currentUser.teacher.id, month)}
              onRefreshClass={(month) => fetchTeacherClassData(currentUser.teacher.assigned_division || currentUser.teacher.managed_divisions?.[0], month)}
              schoolInfo={schoolInfo}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Bottom Nav */}
      <BottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

// Router App Utama
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nebula_presence_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    const stops = [
      { minute: 0, canvas: '#18243b', accent: '#607da8', warm: '#25324a' },
      { minute: 300, canvas: '#263b58', accent: '#83aaca', warm: '#bd9b8f' },
      { minute: 420, canvas: '#c8e7fb', accent: '#55a9df', warm: '#ffe0b0' },
      { minute: 600, canvas: '#e6f6ff', accent: '#269bd3', warm: '#f8fcff' },
      { minute: 900, canvas: '#d7edfb', accent: '#318fc4', warm: '#d7f0ff' },
      { minute: 1020, canvas: '#ffd0b2', accent: '#e47d57', warm: '#ffc18f' },
      { minute: 1140, canvas: '#6a6077', accent: '#ba8a8c', warm: '#514359' },
      { minute: 1260, canvas: '#263650', accent: '#708bb8', warm: '#2a354e' },
      { minute: 1440, canvas: '#18243b', accent: '#607da8', warm: '#25324a' }
    ];
    const toRgb = hex => hex.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16));
    const toHex = values => '#' + values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, t) => toHex(toRgb(a).map((value, index) => value + (toRgb(b)[index] - value) * t));
    const updateSky = () => {
      const now = new Date();
      const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const hour = minute / 60;
      const phase = hour >= 5 && hour < 10 ? 'morning' : hour >= 10 && hour < 16 ? 'day' : hour >= 16 && hour < 19 ? 'sunset' : 'night';
      root.dataset.skyPhase = phase;
      let index = stops.findIndex((stop, i) => i < stops.length - 1 && minute >= stop.minute && minute <= stops[i + 1].minute);
      if (index < 0) index = stops.length - 2;
      const from = stops[index], to = stops[index + 1];
      const progress = Math.max(0, Math.min(1, (minute - from.minute) / (to.minute - from.minute)));
      root.style.setProperty('--portal-sky-canvas', mix(from.canvas, to.canvas, progress));
      root.style.setProperty('--portal-sky-accent', mix(from.accent, to.accent, progress));
      root.style.setProperty('--portal-sky-warm', mix(from.warm, to.warm, progress));
    };
    updateSky();
    const timer = window.setInterval(updateSky, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/portal/info')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) setSchoolInfo(res.data);
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    try {
      if (token) localStorage.setItem('nebula_portal_token', token);
      localStorage.setItem('nebula_presence_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    toast.info('Anda telah keluar dari Portal.');
    setCurrentUser(null);
    try {
      authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('nebula_portal_token');
      localStorage.removeItem('nebula_presence_user');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Halaman Login */}
        <Route 
          path="/login" 
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* 2. Rute Utama Portal (Siswa, Guru, maupun Admin otomatis berada di dalam layout Sidebar seragam) */}
        <Route 
          path="/" 
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : (
              <PortalLayout 
                currentUser={currentUser} 
                onLogout={handleLogout} 
                schoolInfo={schoolInfo} 
              />
            )
          } 
        />

        {/* Rute /admin dialihkan ke root / agar menggunakan layout standar */}
        <Route path="/admin" element={<Navigate to="/" replace />} />

        {/* Fallback ke Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3200} newestOnTop closeOnClick pauseOnFocusLoss draggable theme="light" toastClassName="!rounded-2xl !border !border-slate-200 !shadow-xl" />
    </BrowserRouter>
  );
}
