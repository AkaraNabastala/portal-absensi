import React from 'react';
import AdminOverviewTab from './AdminOverviewTab';
import AdminSchedulesTab from './AdminSchedulesTab';
import AdminJournalsTab from './AdminJournalsTab';
import AdminEkskulTab from './AdminEkskulTab';
import AdminSyncTab from './AdminSyncTab';

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

            {activeTab === 'sync' && (
                <AdminSyncTab
                    settings={settings}
                    onSettingsChange={(newSet) => setSettings(newSet)}
                />
            )}
        </div>
    );
}

