import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Materials from './pages/Materials';
import Mixture from './pages/Mixture';
import Thickness from './pages/Thickness';
import Archives from './pages/Archives';
import Formulas from './pages/Formulas';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/materials" replace />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/mixture" element={<Mixture />} />
        <Route path="/thickness" element={<Thickness />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/formulas" element={<Formulas />} />
      </Routes>
    </Layout>
  );
}
