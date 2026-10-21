import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, canManage, isAdmin, isSigner } from './auth.jsx';
import { ToastProvider, Icon, Loading, useApi, BusyBar } from './components/ui.jsx';
import { ROLE_SHORT } from './format.js';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Requests from './pages/Requests.jsx';
import RequestForm from './pages/RequestForm.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import Sign from './pages/Sign.jsx';
import Beneficiaries from './pages/Beneficiaries.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import Audit from './pages/Audit.jsx';
import Profile from './pages/Profile.jsx';

function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  React.useEffect(() => setOpen(false), [loc.pathname]);
  const manager = canManage(user);
  const admin = isAdmin(user);
  const signer = isSigner(user);
  const s = useApi('/stats/summary', [loc.pathname]);
  const inSign = s.data?.counts?.in_signature?.n || 0;
  const mine = s.data?.mine?.length || 0;
  const toExec = s.data?.to_execute?.length || 0;
  // Le voci sotto /istanze si distinguono per i parametri (?mine=1, ?status=...): l'evidenziazione confronta percorso e parametri
  const L = ({ to, icon, children, count, end }) => {
    const [path, query = ''] = to.split('?');
    const active = loc.pathname === path ? loc.search.replace(/^\?/, '') === query : (!end && loc.pathname.startsWith(`${path}/`) && !query);
    return <NavLink to={to} className={() => (active ? 'active' : '')}><Icon name={icon} />{children}{count ? <span className="count">{count}</span> : null}</NavLink>;
  };
  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand"><img src="/logo-light.svg" alt="Toscana Diagnostica" /><div className="app">Finance · Autorizzazioni</div></div>
        <nav>
          <L to="/" icon="home" end>Dashboard</L>
          <div className="group">Autorizzazioni al pagamento</div>
          {manager && <L to="/istanze/nuova" icon="plus">Nuova istanza</L>}
          {signer && <L to="/istanze?mine=1" icon="pen" count={mine}>Da firmare</L>}
          <L to="/istanze?status=IN_FIRMA" icon="mail" count={inSign}>In firma</L>
          {manager && <L to="/istanze?status=FIRMATA" icon="bank" count={toExec}>Da eseguire</L>}
          <L to="/istanze" icon="list" end>Tutte le istanze</L>
          <L to="/archivio" icon="archive">Archivio</L>
          <div className="group">Anagrafiche</div>
          <L to="/beneficiari" icon="users">Beneficiari e IBAN</L>
          {admin && <>
            <div className="group">Amministrazione</div>
            <L to="/utenti" icon="user">Utenti</L>
            <L to="/impostazioni" icon="gear">Impostazioni</L>
            <L to="/audit" icon="shield">Registro attività</L>
          </>}
        </nav>
        <div className="me">
          <div className="name">{user.full_name}</div>
          <div>{ROLE_SHORT[user.role]}{user.is_admin ? ' · Amministratore' : ''}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <NavLink to="/profilo" className="btn sm ghost" style={{ color: 'var(--teal)' }}>Profilo</NavLink>
            <button className="btn sm dark" onClick={logout}>Esci</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar"><button onClick={() => setOpen(!open)} aria-label="Menu">☰</button><img src="/logo-light.svg" alt="" /></div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {manager && <Route path="/istanze/nuova" element={<RequestForm />} />}
          {manager && <Route path="/istanze/:id/modifica" element={<RequestForm />} />}
          <Route path="/istanze" element={<Requests />} />
          <Route path="/archivio" element={<Requests archive />} />
          <Route path="/istanze/:id" element={<RequestDetail />} />
          <Route path="/firma/:token" element={<Sign />} />
          <Route path="/beneficiari" element={<Beneficiaries />} />
          {admin && <Route path="/utenti" element={<Users />} />}
          {admin && <Route path="/impostazioni" element={<Settings />} />}
          {admin && <Route path="/audit" element={<Audit />} />}
          <Route path="/profilo" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Gate() {
  const { loading, user, onboarding } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  if (onboarding) return <Onboarding />;
  return <Shell />;
}

export default function App() {
  return (
    <ToastProvider>
      <BusyBar />
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
