// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Respuesta del paso 1 del login (antes del 2FA)
export interface AdminLoginResponse {
  pending_token: string;
  requires_2fa_setup: boolean;
}

// Respuesta del setup de 2FA — QR + secret manual
export interface Admin2faSetupResponse {
  qrCodeDataUrl: string;
  manualEntrySecret: string;
  confirm_pending_token: string;        // Nuevo pending token con purpose 2fa-confirm, emitido por el backend después de consumir el token de setup. Usarlo en /2fa/confirm.
}
// ── Admins ───────────────────────────────────────────────────────────────────

export interface AdminResponse {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminPayload {
  username: string;
  password: string;
}

export interface UpdateAdminPayload {
  username?: string;
  password?: string;
}

export interface Reset2faPayload {
  password: string;
}