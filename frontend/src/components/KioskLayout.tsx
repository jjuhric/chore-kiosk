import React, { type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KioskLayoutProps {
  title: string;
  userName: string;
  children: ReactNode; // The main active view goes here
  bottomNav?: ReactNode; // Optional tabs for the bottom
}

export const KioskLayout: React.FC<KioskLayoutProps> = ({ title, userName, children, bottomNav }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      
      {/* 1. Fixed Header (70px) */}
      <header style={{ 
        height: 'var(--header-height)', 
        backgroundColor: '#1f2937', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 1.5rem',
        flexShrink: 0 // Prevents header from collapsing
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
          <span style={{ backgroundColor: '#374151', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '1rem' }}>
            {userName}
          </span>
        </div>
        
        {/* Large, easy-to-tap logout button */}
        <button 
          onClick={handleLogout}
          style={{ 
            backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <LogOut size={24} /> Exit
        </button>
      </header>

      {/* 2. Main Content Area (Calculated remaining height) */}
      <main style={{ 
        flex: 1, 
        overflow: 'hidden', /* Lock scrolling */
        padding: '1rem',
        position: 'relative'
      }}>
        {children}
      </main>

      {/* 3. Fixed Bottom Nav (80px - Optional) */}
      {bottomNav && (
        <nav style={{ 
          height: 'var(--nav-height)', 
          backgroundColor: 'white', 
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          flexShrink: 0
        }}>
          {bottomNav}
        </nav>
      )}

    </div>
  );
};