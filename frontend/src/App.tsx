import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
// 1. Import the real component here
import { AdultDashboard } from './pages/AdultDashboard'; 
import { ChildDashboard } from './pages/ChildDashboard';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* 3. This now points to your actual file */}
        <Route path="/adult-dashboard" element={<AdultDashboard />} /> 
        <Route path="/child-dashboard" element={<ChildDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;