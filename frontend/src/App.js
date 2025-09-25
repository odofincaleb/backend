import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Campaigns from './pages/Campaigns/Campaigns';
import CreateCampaign from './pages/Campaigns/CreateCampaign';
import TitleQueue from './pages/TitleQueue/TitleQueue';
import ContentGeneration from './pages/Content/ContentGeneration';
import WordPressSites from './pages/WordPress/WordPressSites';
import Settings from './pages/Settings/Settings';
import License from './pages/License/License';
import LoadingSpinner from './components/UI/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/*" 
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/create" element={<CreateCampaign />} />
                <Route path="/campaigns/:id" element={<CreateCampaign />} />
                <Route path="/title-queue/:campaignId" element={<TitleQueue />} />
                <Route path="/content/:campaignId" element={<ContentGeneration />} />
                <Route path="/wordpress" element={<WordPressSites />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/license" element={<License />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
}

export default App;

