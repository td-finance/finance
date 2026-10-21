import { one } from '../db.js';
import { config } from '../config.js';
import { forbidden, HttpError } from './util.js';

export const USER_COLS = 'id, email, full_name, title, role, is_admin, auth_provider, must_change_password, totp_enabled, active, last_login_at, created_at';

export async function loadUser(req, _res, next) {
  try {
    const id = req.session?.userId;
    if (id) {
      const u = await one(`SELECT ${USER_COLS} FROM users WHERE id=$1`, [id]);
      if (u && u.active) req.user = u;
      else req.session.userId = null;
    }
    next();
  } catch (e) { next(e); }
}

const ONBOARDING_PATHS = ['/api/auth/me', '/api/auth/logout', '/api/auth/change-password', '/api/auth/totp/setup', '/api/auth/totp/enable'];

export function onboardingState(req) {
  const u = req.user;
  if (!u) return null;
  const local = req.session.authMethod === 'LOCAL';
  if (local && u.must_change_password) return 'PASSWORD_CHANGE_REQUIRED';
  if (local && config.requireTotpForAdmins && u.is_admin && !u.totp_enabled) return 'TOTP_SETUP_REQUIRED';
  return null;
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sessione scaduta o non autenticata'));
  const st = onboardingState(req);
  if (st && !ONBOARDING_PATHS.includes(req.originalUrl.split('?')[0])) {
    const e = new HttpError(403, st === 'PASSWORD_CHANGE_REQUIRED' ? 'Cambio password obbligatorio' : 'Attivazione verifica in due passaggi obbligatoria');
    e.code = st;
    return next(e);
  }
  next();
}

export const isAdmin = (u) => Boolean(u?.is_admin);
export const isSigner = (u) => ['CEO', 'CFO'].includes(u?.role);
// Finance Support (e gli amministratori) inseriscono e gestiscono le istanze
export const canManage = (u) => u?.role === 'SUPPORT' || isAdmin(u);
export const requireAdmin = (req, _res, next) => (isAdmin(req.user) ? next() : next(forbidden('Riservato agli amministratori')));
export const requireManage = (req, _res, next) => (canManage(req.user) ? next() : next(forbidden('Operazione riservata a Finance Support')));
export const requireRole = (...roles) => (req, _res, next) => (roles.includes(req.user?.role) ? next() : next(forbidden()));
