import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ScanFace } from 'lucide-react';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleScan = async (text: string) => {
    if (!text) return;
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: text }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the user data locally for the dashboards to use
        localStorage.setItem('kiosk_user', JSON.stringify(data.user));
        localStorage.setItem('kiosk_token', data.token);

        // Route to the correct dashboard based on role
        if (data.user.role === 'adult') {
          navigate('/adult-dashboard');
        } else {
          navigate('/child-dashboard');
        }
      } else {
        setError(data.error || 'Invalid QR Code');
        setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
      }
    } catch (err) {
      setError('Network error connecting to server.');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      width: '100vw',
      backgroundColor: 'var(--bg-color)',
      overflow: 'hidden' /* Strict no-scroll */
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '1rem', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
        textAlign: 'center', 
        width: '90%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxHeight: '95vh' /* Prevents clipping on shorter displays */
      }}>
        <ScanFace size={40} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#1f2937' }}>Kiosk Login</h1>
        <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '1.1rem' }}>Show your QR Badge to the camera</p>
        
        <div style={{ 
          borderRadius: '0.5rem', 
          overflow: 'hidden', 
          border: '4px solid #e5e7eb',
          width: '100%',
          maxWidth: '280px', /* Keeps the camera feed compact */
          aspectRatio: '1 / 1' /* Forces a square so it doesn't push the UI off-screen */
        }}>
          <Scanner 
            onScan={(result) => {
              if (result[0]?.rawValue) handleScan(result[0].rawValue);
            }}
            allowMultiple={false}
          />
        </div>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '0.5rem', width: '100%', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {error}
          </div>
        )}
        {/* DEV BYPASS BUTTON - Only shows in local development */}
        {import.meta.env.DEV && (
          <button 
            onClick={() => {
              // Inject the seeded adult user data into local storage
              localStorage.setItem('kiosk_user', JSON.stringify({ 
                id: 1, 
                name: 'Jeffery', 
                role: 'adult', 
                current_balance: 0 
              }));
              localStorage.setItem('kiosk_token', 'temporary_dev_token');
              navigate('/adult-dashboard');
            }} 
            style={{ 
              marginTop: '1.5rem', padding: '0.75rem 1.5rem', 
              backgroundColor: '#1f2937', color: 'white', 
              borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' 
            }}
          >
            🛠️ DEV: Login as Adult
          </button>
        )}
        {/* DEV BYPASS BUTTON - Child */}
        {import.meta.env.DEV && (
          <button 
            onClick={() => {
              // Inject the seeded child user data (ID 2 is Faith based on our init script)
              localStorage.setItem('kiosk_user', JSON.stringify({ 
                id: 2, 
                name: 'Faith', 
                role: 'child', 
                current_balance: 0 
              }));
              localStorage.setItem('kiosk_token', 'temporary_dev_token');
              navigate('/child-dashboard');
            }} 
            style={{ 
              marginTop: '0.75rem', padding: '0.75rem 1.5rem', 
              backgroundColor: '#10b981', color: 'white', 
              borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', width: '100%' 
            }}
          >
            🧸 DEV: Login as Child
          </button>
        )}
        {/* DEV UTILITY - Generate Today's Chores */}
        {import.meta.env.DEV && (
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/assignments/generate', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                  alert(`Success! Added ${data.result.addedCount} new assignments for today.`);
                } else {
                  alert(`Error: ${data.error}`);
                }
              } catch (e) {
                alert('Network error triggering generation.');
              }
            }} 
            style={{ 
              marginTop: '0.75rem', padding: '0.75rem 1.5rem', 
              backgroundColor: '#8b5cf6', color: 'white', 
              borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', width: '100%' 
            }}
          >
            ⚙️ DEV: Generate Today's Tasks
          </button>
        )}
      </div>
    </div>
  );
};