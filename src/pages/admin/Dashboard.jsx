import React from 'react';
import AdminOverviewTab from './AdminOverviewTab';
import AdminSchedulesTab from './AdminSchedulesTab';
import AdminJournalsTab from './AdminJournalsTab';
import AdminEkskulTab from './AdminEkskulTab';
import AdminSyncTab from './AdminSyncTab';
import AdminUsersTab from './AdminUsersTab';
import AdminProfileTab from './AdminProfileTab';
import AdminSubjectAttendanceTab from './AdminSubjectAttendanceTab';
import AdminAttendanceMonitoringTab from './AdminAttendanceMonitoringTab';
import { authFetch } from '../../utils/api';

function TeacherSubstituteTab() {
    const [requests, setRequests] = React.useState([]);
    const [teachers, setTeachers] = React.useState([]);
    const [selected, setSelected] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [busyId, setBusyId] = React.useState(null);
    const [feedback, setFeedback] = React.useState({ type: '', message: '' });

    const load = async () => {
        setLoading(true);
        try {
            const [requestRes, teacherRes] = await Promise.all([
                authFetch('/api/teacher/absence-requests'),
                authFetch('/api/admin/teachers')
            ]);
            const [requestData, teacherData] = await Promise.all([requestRes.json(), teacherRes.json()]);
            if (!requestRes.ok || !requestData.success) throw new Error(requestData.message || 'Gagal memuat pengajuan.');
            if (!teacherRes.ok || !teacherData.success) throw new Error(teacherData.message || 'Gagal memuat daftar guru.');
            setRequests(requestData.data || []);
            setTeachers(teacherData.data || []);
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { load(); }, []);

    const assign = async (requestId) => {
        const substituteTeacherId = Number(selected[requestId]);
        if (!substituteTeacherId) {
            setFeedback({ type: 'error', message: 'Pilih guru pengganti terlebih dahulu.' });
            return;
        }
        setBusyId(requestId);
        setFeedback({ type: 'progress', message: 'Menyimpan penugasan guru pengganti…' });
        try {
            const res = await authFetch(`/api/admin/absence-requests/${requestId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ substituteTeacherId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Penunjukan guru pengganti gagal.');
            setFeedback({ type: 'success', message: data.message || 'Guru pengganti berhasil ditetapkan.' });
            await load();
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Gagal menetapkan guru pengganti.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold text-slate-900">Izin & Guru Pengganti</h2><p className="mt-1 text-sm text-slate-500">Tinjau izin dan tetapkan pengganti untuk jadwal mengajar.</p></div>
            </div>
            {feedback.message && <div role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700' : feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{feedback.message}</div>}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                {loading ? <p className="py-8 text-center text-sm text-slate-500">Memuat data…</p> : requests.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Belum ada pengajuan izin guru.</p> : (
                    <div className="space-y-3">
                        {requests.map(row => (
                            <article key={row.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div><h3 className="font-semibold text-slate-900">{row.teacher_name}</h3><p className="text-sm text-slate-600">{row.start_date} – {row.end_date}</p><p className="mt-1 text-sm text-slate-500">{row.reason}</p></div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'DISETUJUI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span>
                                </div>
                                {row.status !== 'DISETUJUI' && <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <select value={selected[row.id] || ''} onChange={e => setSelected(prev => ({ ...prev, [row.id]: e.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm">
                                        <option value="">Pilih guru pengganti</option>
                                        {teachers.filter(t => Number(t.id) !== Number(row.teacher_id)).map(t => <option key={t.id} value={t.id}>{t.full_name} · {t.nip}</option>)}
                                    </select>
                                    <button disabled={busyId === row.id} onClick={() => assign(row.id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === row.id ? 'Menyimpan…' : 'Tetapkan Pengganti'}</button>
                                </div>}
                                {row.substitute_name && <p className="mt-3 text-sm font-medium text-emerald-700">Pengganti: {row.substitute_name}</p>}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function AdminDashboard({ 
    currentUser, 
    initialSettings, 
    activeTab, 
    setActiveTab, 
    schoolInfo 
}) {
    const [settings, setSettings] = React.useState(initialSettings || currentUser?.settings || {});

    return (
        <div className="space-y-6">
            {activeTab === 'users' && <AdminUsersTab />}
            {activeTab === 'admin_profile' && <AdminProfileTab currentUser={currentUser} />}
            {activeTab === 'subject_attendance' && <AdminSubjectAttendanceTab />}
            {activeTab === 'attendance_monitoring' && <AdminAttendanceMonitoringTab />}

            {activeTab === 'overview' && (
                <AdminOverviewTab
                    settings={settings}
                    setActiveTab={setActiveTab}
                    schoolInfo={schoolInfo}
                />
            )}

            {activeTab === 'admin_schedules' && (
                <AdminSchedulesTab schoolInfo={schoolInfo} />
            )}

            {activeTab === 'admin_journals' && (
                <AdminJournalsTab schoolInfo={schoolInfo} />
            )}

            {activeTab === 'ekskul' && (
                <AdminEkskulTab />
            )}

            {activeTab === 'substitutes' && <TeacherSubstituteTab />}

            {activeTab === 'sync' && (
                <AdminSyncTab
                    settings={settings}
                    onSettingsChange={(newSet) => setSettings(newSet)}
                />
            )}
        </div>
    );
}

