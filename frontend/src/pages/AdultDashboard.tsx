import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, Plus, QrCode, DollarSign, 
  ClipboardList, Users, Settings, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { KioskLayout } from '../components/KioskLayout';

// --- Shared Interfaces ---
interface User { id: number; name: string; role: string; current_balance: number; sms_email: string; }
interface Chore { 
  id: number; 
  title: string; 
  type: string; 
  reward_value: number; 
  assigned_day?: number; 
  target_user_id?: number | null; 
  target_user_name?: string; 
}
interface Assignment { 
  id: number; 
  chore_id: number; 
  user_id: number; 
  status: string; 
  chore_title?: string; 
  reward_value?: number; 
  childName?: string; 
}

// --- Reusable Touch Carousel Component ---
function Carousel<T>({ items, renderItem, emptyMessage, itemsPerPage = 2 }: { items: T[], renderItem: (item: T) => React.ReactNode, emptyMessage: string, itemsPerPage?: number }) {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => setStartIndex(0), [items.length]);

  const showPrev = startIndex > 0;
  const showNext = startIndex + itemsPerPage < items.length;

  const btnStyle = {
    width: '80px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
    color: '#374151', flexShrink: 0
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', gap: '1rem' }}>
      <button 
        onClick={() => setStartIndex(s => Math.max(0, s - itemsPerPage))} 
        disabled={!showPrev} 
        style={{ ...btnStyle, opacity: showPrev ? 1 : 0.1 }}
      >
        <ChevronLeft size={64} />
      </button>

      <div style={{ flex: 1, display: 'flex', gap: '1.5rem', height: '100%', padding: '1rem 0' }}>
        {items.length === 0 ? (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {emptyMessage}
          </div>
        ) : (
          items.slice(startIndex, startIndex + itemsPerPage).map(renderItem)
        )}
      </div>

      <button 
        onClick={() => setStartIndex(s => Math.min(items.length - 1, s + itemsPerPage))} 
        disabled={!showNext} 
        style={{ ...btnStyle, opacity: showNext ? 1 : 0.1 }}
      >
        <ChevronRight size={64} />
      </button>
    </div>
  );
}

// --- Main Dashboard Component ---
export const AdultDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'approvals' | 'kids' | 'chores'>('approvals');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [children, setChildren] = useState<User[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [masterChores, setMasterChores] = useState<Chore[]>([]);

  // Toggle and state for the chore creation form
  const [showAddChore, setShowAddChore] = useState(false);
  const [newChore, setNewChore] = useState({ title: '', type: 'daily', reward_value: 1.00, assigned_day: 0, target_user_id: '' });

  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    const user = JSON.parse(localStorage.getItem('kiosk_user') || '{}');
    if (!token || user.role !== 'adult') {
      navigate('/');
      return;
    }
    setCurrentUser(user);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const usersRes = await fetch('/api/users');
      const users: User[] = await usersRes.json();
      const kids = users.filter(u => u.role === 'child');
      setChildren(kids);

      const choresRes = await fetch('/api/chores');
      setMasterChores(await choresRes.json());

      let allPending: Assignment[] = [];
      for (const kid of kids) {
        const assignRes = await fetch(`/api/assignments/user/${kid.id}`);
        const assignments: Assignment[] = await assignRes.json();
        const pending = assignments
          .filter(a => a.status === 'awaiting_verification')
          .map(a => ({ ...a, childName: kid.name }));
        allPending = [...allPending, ...pending];
      }
      setPendingAssignments(allPending);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    }
  };

  // --- API Handlers ---

  const handleApproveReject = async (assignmentId: number, status: 'approved' | 'rejected') => {
    await fetch(`/api/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchDashboardData(); 
  };

  const handleCreateChore = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newChore)
    });
    setNewChore({ title: '', type: 'daily', reward_value: 1.00, assigned_day: 0, target_user_id: '' });
    setShowAddChore(false);
    fetchDashboardData();
  };

  const handleDeleteChore = async (choreId: number) => {
    if (!window.confirm("Delete this task? It will also remove any pending assignments for it.")) return;
    await fetch(`/api/chores/${choreId}`, { method: 'DELETE' });
    fetchDashboardData(); 
  };

  const handleResendQR = async (userId: number, emailAddress: string) => {
    if (!emailAddress) return;
    try {
      const res = await fetch('/api/auth/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailAddress })
      });
      if (res.ok) {
        alert('QR Code Badge emailed successfully!');
      } else {
        alert('Failed to send QR badge. Check backend console.');
      }
    } catch (err) {
      alert('Network error sending QR code.');
    }
  };

  const handlePayout = async (kidId: number, kidName: string, currentBalance: number) => {
    const amountStr = prompt(`How much are you paying out to ${kidName}?\nCurrent Balance: $${currentBalance.toFixed(2)}`);
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (amount > currentBalance) {
      alert("You cannot pay out more than their available balance.");
      return;
    }

    try {
      const res = await fetch('/api/transactions/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: kidId, amount })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to process payout");
      } else {
        fetchDashboardData(); // Refresh to show new balance
      }
    } catch (error) {
      alert("Network error processing payout.");
    }
  };

  // --- Styles ---
  const cardStyle = { 
    flex: 1, backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', 
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' as const, 
    justifyContent: 'space-between', height: '100%' 
  };
  const btnStyle = (bg: string) => ({ 
    flex: 1, padding: '1rem', borderRadius: '0.75rem', border: 'none', 
    backgroundColor: bg, color: 'white', fontWeight: 'bold', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.2rem' 
  });
  const inputStyle = { padding: '1rem', borderRadius: '0.5rem', border: '2px solid #e5e7eb', width: '100%', marginBottom: '1rem', fontSize: '1.2rem' };

  // --- Bottom Nav Renderer ---
  const renderNav = () => (
    <>
      {[
        { id: 'approvals', icon: ClipboardList, label: 'Approvals', badge: pendingAssignments.length },
        { id: 'kids', icon: Users, label: 'Kids & Payouts' },
        { id: 'chores', icon: Settings, label: 'Manage Tasks' }
      ].map(tab => (
        <button 
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          style={{ 
            flex: 1, border: 'none', backgroundColor: activeTab === tab.id ? '#eff6ff' : 'white',
            color: activeTab === tab.id ? '#3b82f6' : '#6b7280', borderTop: activeTab === tab.id ? '4px solid #3b82f6' : '4px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold'
          }}
        >
          <div style={{ position: 'relative' }}>
            <tab.icon size={32} style={{ marginBottom: '0.25rem' }} />
            {tab.badge ? (
              <span style={{ position: 'absolute', top: -5, right: -15, backgroundColor: '#ef4444', color: 'white', borderRadius: '1rem', padding: '0.1rem 0.5rem', fontSize: '0.9rem' }}>
                {tab.badge}
              </span>
            ) : null}
          </div>
          {tab.label}
        </button>
      ))}
    </>
  );

  return (
    <KioskLayout title="Command Center" userName={currentUser?.name || 'Adult'} bottomNav={renderNav()}>
      
      {/* 1. APPROVALS VIEW */}
      {activeTab === 'approvals' && (
        <Carousel 
          items={pendingAssignments} 
          emptyMessage="All caught up! No chores pending approval."
          renderItem={(a) => (
            <div key={a.id} style={cardStyle}>
              <div>
                <h3 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#1f2937' }}>{a.chore_title}</h3>
                <p style={{ fontSize: '1.3rem', color: '#6b7280', margin: 0 }}>
                  Completed by <span style={{color: '#3b82f6', fontWeight: 'bold'}}>{a.childName}</span>
                </p>
                <p style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold', marginTop: '1rem' }}>+ ${a.reward_value?.toFixed(2)}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => handleApproveReject(a.id, 'rejected')} style={btnStyle('#ef4444')}><XCircle size={24} /> Reject</button>
                <button onClick={() => handleApproveReject(a.id, 'approved')} style={btnStyle('#10b981')}><CheckCircle size={24} /> Approve</button>
              </div>
            </div>
          )}
        />
      )}

      {/* 2. KIDS & PAYOUTS VIEW */}
      {activeTab === 'kids' && (
        <Carousel 
          items={children} 
          emptyMessage="No kids found in the database."
          renderItem={(kid) => (
            <div key={kid.id} style={cardStyle}>
              <div>
                <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{kid.name}</h3>
                <p style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold', margin: 0 }}>Available: ${kid.current_balance.toFixed(2)}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => {
                   const email = prompt(`Enter email to send ${kid.name}'s badge to:`);
                   if (email) handleResendQR(kid.id, email);
                }} style={btnStyle('#3b82f6')}><QrCode size={24} /> Badge</button>
                <button onClick={() => handlePayout(kid.id, kid.name, kid.current_balance)} style={btnStyle('#f59e0b')}><DollarSign size={24} /> Payout</button>
              </div>
            </div>
          )}
        />
      )}

      {/* 3. MANAGE TASKS VIEW */}
      {activeTab === 'chores' && (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={() => setShowAddChore(!showAddChore)} style={{ ...btnStyle(showAddChore ? '#6b7280' : '#2563eb'), flex: 'none', width: '200px', padding: '0.75rem' }}>
              {showAddChore ? 'Cancel' : <><Plus size={24} /> Add Task</>}
            </button>
          </div>

          {/* Dynamic Content Area */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {showAddChore ? (
              <div style={{ ...cardStyle, maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Create New Master Task</h3>
                <form onSubmit={handleCreateChore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <input style={inputStyle} placeholder="Chore Title (e.g., Vacuum Living Room)" value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} required />
                  
                  {/* NEW: Assignment Dropdown */}
                  <select style={inputStyle} value={newChore.target_user_id} onChange={e => setNewChore({...newChore, target_user_id: e.target.value})}>
                    <option value="">All Kids</option>
                    {children.map(kid => (
                      <option key={kid.id} value={kid.id}>Only {kid.name}</option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <select style={{ ...inputStyle, flex: 1 }} value={newChore.type} onChange={e => setNewChore({...newChore, type: e.target.value as 'daily'|'weekly'})}>
                      <option value="daily">Daily Task</option>
                      <option value="weekly">Weekly Task</option>
                    </select>
                    {newChore.type === 'weekly' && (
                      <select style={{ ...inputStyle, flex: 1 }} value={newChore.assigned_day} onChange={e => setNewChore({...newChore, assigned_day: parseInt(e.target.value)})}>
                        <option value={0}>Sunday</option><option value={1}>Monday</option><option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option><option value={4}>Thursday</option><option value={5}>Friday</option><option value={6}>Saturday</option>
                      </select>
                    )}
                  </div>
                  <input style={inputStyle} type="number" step="0.25" placeholder="Reward Value ($)" value={newChore.reward_value} onChange={e => setNewChore({...newChore, reward_value: parseFloat(e.target.value)})} required />
                  <div style={{ flex: 1 }} /> {/* Spacer */}
                  <button type="submit" style={btnStyle('#10b981')}>Save Task</button>
                </form>
              </div>
            ) : (
              <Carousel 
                items={masterChores} 
                emptyMessage="No master chores configured yet."
                renderItem={(chore) => (
                  <div key={chore.id} style={cardStyle}>
                    <div>
                      <h3 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{chore.title}</h3>
                      <p style={{ fontSize: '1.2rem', color: '#6b7280', margin: 0 }}>
                        {chore.type === 'weekly' ? `Weekly (Day ${chore.assigned_day})` : 'Daily'}
                        <br/>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                          Assigned to: {chore.target_user_name || 'All Kids'}
                        </span>
                      </p>
                    </div>
                    <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold', textAlign: 'center', margin: 'auto 0' }}>
                      ${chore.reward_value.toFixed(2)}
                    </div>
                    <button onClick={() => handleDeleteChore(chore.id)} style={{ ...btnStyle('#ef4444'), marginTop: 'auto' }}>Delete</button>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      )}

    </KioskLayout>
  );
};