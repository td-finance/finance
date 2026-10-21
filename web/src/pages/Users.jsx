import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi, Card, Field, ErrorBox, Loading, Badge, Modal, useToast } from '../components/ui.jsx';
import { ROLE, ROLE_HELP, itDateTime } from '../format.js';

const PROVIDER = { ENTRA: 'Microsoft 365', BOTH: 'Microsoft 365 o password', LOCAL: 'Email e password' };
const TONE = { SUPPORT: 'blue', CEO: 'teal', CFO: 'teal', VIEWER: 'grey' };

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const list = useApi('/users');
  const [edit, setEdit] = useState(null);
  const [temp, setTemp] = useState(null);
  const save = async () => {
    try {
      const body = { full_name: edit.full_name, title: edit.title || null, role: edit.role, is_admin: Boolean(edit.is_admin), auth_provider: edit.auth_provider, active: edit.active, email: edit.email };
      if (edit.id) await api.put(`/users/${edit.id}`, body);
      else { const r = await api.post('/users', body); if (r.temp_password) setTemp({ email: r.email, pwd: r.temp_password }); }
      setEdit(null); list.reload(); toast('Utente salvato');
    } catch (e) { toast(e.message, 'err'); }
  };
  const reset = async (u) => { try { const r = await api.post(`/users/${u.id}/reset-password`); setTemp({ email: u.email, pwd: r.temp_password }); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Utenti</h1><div className="sub">Quattro profili: Finance Support, CEO, CFO, Consultazione. CEO e CFO sono i firmatari: uno solo attivo per ruolo, con la stessa email dell'account Microsoft 365.</div></div><button className="btn" onClick={() => setEdit({ email: '', full_name: '', title: '', role: 'SUPPORT', is_admin: false, auth_provider: 'ENTRA', active: true })}>+ Nuovo utente</button></div>
      <ErrorBox error={list.error} />
      <Card flush>{!list.data ? <Loading /> : (
        <table className="t"><thead><tr><th>Utente</th><th>Profilo</th><th>Accesso</th><th>Ultimo accesso</th><th className="num">Azioni</th></tr></thead>
          <tbody>{list.data.map((u) => <tr key={u.id}><td><div className="strong">{u.title ? `${u.title} ` : ''}{u.full_name}</div><div className="small muted">{u.email}</div></td><td><Badge tone={TONE[u.role]}>{ROLE[u.role]}</Badge> {u.is_admin && <Badge tone="mauve">Amministratore</Badge>} {!u.active && <Badge tone="red">Disattivato</Badge>}</td><td>{PROVIDER[u.auth_provider]}{u.totp_enabled ? <span className="small muted"> · 2FA</span> : ''}</td><td className="small muted">{itDateTime(u.last_login_at) || '–'}</td><td className="num"><button className="btn sm ghost" onClick={() => setEdit(u)}>Modifica</button> {u.auth_provider !== 'ENTRA' && <button className="btn sm ghost" onClick={() => reset(u)}>Reset password</button>}</td></tr>)}</tbody></table>
      )}</Card>
      {edit && <Modal title={edit.id ? 'Modifica utente' : 'Nuovo utente'} onClose={() => setEdit(null)} footer={<><button className="btn ghost" onClick={() => setEdit(null)}>Annulla</button><button className="btn" onClick={save}>Salva</button></>}>
        <div className="form-grid">
          <Field label="Titolo (sul modulo)"><input value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Dott." /></Field>
          <Field label="Nome e cognome"><input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
          <Field label="Email (account Microsoft 365)" className="span2"><input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
          <Field label="Profilo" help={ROLE_HELP[edit.role]}><select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{Object.entries(ROLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Metodo di accesso" help="Per firmare serve comunque l'accesso Microsoft 365"><select value={edit.auth_provider} onChange={(e) => setEdit({ ...edit, auth_provider: e.target.value })}>{Object.entries(PROVIDER).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Amministratore" className="inline"><input type="checkbox" checked={Boolean(edit.is_admin)} disabled={edit.id === user.id} onChange={(e) => setEdit({ ...edit, is_admin: e.target.checked })} /> gestisce utenti e impostazioni</Field>
          {edit.id && edit.id !== user.id && <Field label="Attivo" className="inline"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> account abilitato</Field>}
        </div>
      </Modal>}
      {temp && <Modal title="Password temporanea" onClose={() => setTemp(null)} footer={<button className="btn" onClick={() => setTemp(null)}>Chiudi</button>}><p>Comunica all'utente <b>{temp.email}</b> la password temporanea (va cambiata al primo accesso):</p><p className="mono" style={{ fontSize: 18, background: 'var(--teal-050)', padding: 12, borderRadius: 8 }}>{temp.pwd}</p></Modal>}
    </div>
  );
}
