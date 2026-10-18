import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Navbar from './components/Navbar';
import { authFetch } from './utils/api';

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
  const teacherDiv = currentUser?.teacher?.assigned_division;
  const studentId = currentUser?.student?.id;
  const userRole = currentUser?.role;

  useEffect(() => {
    if (userRole === 'PARENT' && studentId) {
      fetchPersonalData(studentId);
    } else if (userRole === 'TEACHER') {
      if (teacherId) fetchPersonalData(teacherId);
      if (teacherIsWali && teacherDiv) fetchTeacherClassData(teacherDiv);
    }

    // Auto-refresh data setiap 10 detik agar kehadiran / scan RFID langsung terupdate di layar
    const interval = setInterval(() => {
      if (userRole === 'PARENT' && studentId) {
        fetchPersonalData(studentId);
      } else if (userRole === 'TEACHER') {
        if (teacherId) fetchPersonalData(teacherId);
        if (teacherIsWali && teacherDiv) fetchTeacherClassData(teacherDiv);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [userRole, studentId, teacherId, teacherIsWali, teacherDiv]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased relative">
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

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
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
              onRefreshClass={(month) => fetchTeacherClassData(currentUser.teacher.assigned_division, month)}
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
    </BrowserRouter>
  );
}
