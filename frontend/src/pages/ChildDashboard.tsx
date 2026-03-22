import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Coins, ListTodo, Hourglass } from 'lucide-react';
import { KioskLayout } from '../components/KioskLayout';

// Shared interfaces
interface User { id: number; name: string; role: string; current_balance: number; }
interface Assignment { id: number; chore_id: number; user_id: number; status: string; chore_title?: string; reward_value?: number; }

// --- Reusable Touch Carousel Component ---
function Carousel<T>({ items, renderItem, emptyMessage, itemsPerPage = 2 }: { items: T[], renderItem: (item: T) => React.ReactNode, emptyMessage: string, itemsPerPage?: number }) {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => setStartIndex(0), [items.length]);

  const showPrev = startIndex > 0;
  const showNext = startIndex + itemsPerPage < items.length;

  const btnStyle = {
    width: '80px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
    color: '#374151', flexShrink: 0, fontSize: '3rem'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', gap: '1rem' }}>
      <button onClick={() => setStartIndex(s => Math.max(0, s - itemsPerPage))} disabled={!showPrev} style={{ ...btnStyle, opacity: showPrev ? 1 : 0.1 }}>
        ‹
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
      <button onClick={() => setStartIndex(s => Math.min(items.length - 1, s + itemsPerPage))} disabled={!showNext} style={{ ...btnStyle, opacity: showNext ? 1 : 0.1 }}>
        ›
      </button>
    </div>
  );
}

// --- Main Dashboard Component ---
export const ChildDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'todo' | 'waiting'>('todo');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('kiosk_token');
    const user = JSON.parse(localStorage.getItem('kiosk_user') || '{}');
    
    // Security check
    if (!token || user.role !== 'child') {
      navigate('/');
      return;
    }
    
    setCurrentUser(user);
    fetchChores(user.id);
  }, []);

  const fetchChores = async (userId: number) => {
    try {
      // 1. Fetch fresh user data to get the most accurate balance
      const userRes = await fetch(`/api/users/${userId}`);
      const userData = await userRes.json();
      setCurrentUser(userData);

      // 2. Fetch today's assignments
      const assignRes = await fetch(`/api/assignments/user/${userId}`);
      const assignData = await assignRes.json();
      setAssignments(assignData);
    } catch (error) {
      console.error('Failed to fetch child data', error);
    }
  };

  const handleCompleteChore = async (assignmentId: number) => {
    // Optimistic UI update to make the button feel instantly responsive
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status: 'awaiting_verification' } : a));
    
    try {
      await fetch(`/api/assignments/${assignmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'awaiting_verification' })
      });
      // The backend handles sending the SMS to the adult automatically here
      fetchChores(currentUser!.id); // Refresh to be safe
    } catch (error) {
      alert("Network error updating chore.");
      fetchChores(currentUser!.id); // Revert if failed
    }
  };

  // Filter assignments into the two buckets
  const todoChores = assignments.filter(a => a.status === 'pending' || a.status === 'rejected');
  const waitingChores = assignments.filter(a => a.status === 'awaiting_verification');

  // --- Styles ---
  const cardStyle = (isRejected: boolean) => ({ 
    flex: 1, backgroundColor: isRejected ? '#fef2f2' : 'white', borderRadius: '1rem', padding: '1.5rem', 
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' as const, 
    justifyContent: 'space-between', height: '100%',
    border: isRejected ? '2px solid #ef4444' : '2px solid transparent'
  });
  
  const btnStyle = { 
    width: '100%', padding: '1.25rem', borderRadius: '0.75rem', border: 'none', 
    backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '1.5rem',
    marginTop: 'auto'
  };

  // --- Bottom Nav Renderer ---
  const renderNav = () => (
    <>
      <button 
        onClick={() => setActiveTab('todo')}
        style={{ 
          flex: 1, border: 'none', backgroundColor: activeTab === 'todo' ? '#eff6ff' : 'white',
          color: activeTab === 'todo' ? '#3b82f6' : '#6b7280', borderTop: activeTab === 'todo' ? '4px solid #3b82f6' : '4px solid transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold'
        }}
      >
        <div style={{ position: 'relative' }}>
          <ListTodo size={32} style={{ marginBottom: '0.25rem' }} />
          {todoChores.length > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -15, backgroundColor: '#ef4444', color: 'white', borderRadius: '1rem', padding: '0.1rem 0.5rem', fontSize: '0.9rem' }}>
              {todoChores.length}
            </span>
          )}
        </div>
        To-Do List
      </button>

      <button 
        onClick={() => setActiveTab('waiting')}
        style={{ 
          flex: 1, border: 'none', backgroundColor: activeTab === 'waiting' ? '#fdf8f6' : 'white',
          color: activeTab === 'waiting' ? '#f59e0b' : '#6b7280', borderTop: activeTab === 'waiting' ? '4px solid #f59e0b' : '4px solid transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold'
        }}
      >
        <Hourglass size={32} style={{ marginBottom: '0.25rem' }} />
        Pending Review
      </button>

      {/* Balance Display locked into the bottom nav */}
      <div style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        backgroundColor: '#ecfdf5', borderTop: '4px solid #10b981', color: '#047857'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>My Money</div>
        <div style={{ fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coins size={28} /> ${currentUser?.current_balance.toFixed(2)}
        </div>
      </div>
    </>
  );

  return (
    <KioskLayout title="My Dashboard" userName={currentUser?.name || 'Kid'} bottomNav={renderNav()}>
      
      {/* 1. TO-DO VIEW */}
      {activeTab === 'todo' && (
        <Carousel 
          items={todoChores} 
          emptyMessage="You finished all your chores for today! 🎉"
          renderItem={(chore) => (
            <div key={chore.id} style={cardStyle(chore.status === 'rejected')}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#1f2937', lineHeight: '1.1' }}>{chore.chore_title}</h3>
                  {chore.status === 'rejected' && <AlertCircle size={32} color="#ef4444" />}
                </div>
                
                {chore.status === 'rejected' ? (
                  <p style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold', margin: 0 }}>Try again! Task was not approved.</p>
                ) : (
                  <p style={{ fontSize: '1.2rem', color: '#6b7280', margin: 0 }}>Daily Task</p>
                )}
                
                <p style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: '900', marginTop: '1rem', marginBottom: '0' }}>
                  + ${chore.reward_value?.toFixed(2)}
                </p>
              </div>
              
              <button onClick={() => handleCompleteChore(chore.id)} style={btnStyle}>
                <CheckCircle size={32} /> I Finished It!
              </button>
            </div>
          )}
        />
      )}

      {/* 2. WAITING FOR APPROVAL VIEW */}
      {activeTab === 'waiting' && (
        <Carousel 
          items={waitingChores} 
          emptyMessage="No tasks waiting for review."
          renderItem={(chore) => (
            <div key={chore.id} style={{...cardStyle(false), backgroundColor: '#f9fafb', opacity: 0.8}}>
              <div>
                <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#4b5563' }}>{chore.chore_title}</h3>
                <p style={{ fontSize: '1.2rem', color: '#6b7280', margin: 0 }}>Waiting for an adult to check...</p>
              </div>
              <div style={{ 
                marginTop: 'auto', padding: '1.25rem', backgroundColor: '#fef3c7', borderRadius: '0.75rem', 
                color: '#d97706', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.3rem' 
              }}>
                <Clock size={28} /> Review Pending
              </div>
            </div>
          )}
        />
      )}

    </KioskLayout>
  );
};