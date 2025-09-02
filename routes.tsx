
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { SettingsModal } from './components/SettingsModal';
import { FindSimilarCard } from './components/FindSimilarCard';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<App />} />
  </Routes>
);

export default AppRoutes;
