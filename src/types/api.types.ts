// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminLoginResponse {
  pending_token: string;
  requires_2fa_setup: boolean;
}

export interface Admin2faSetupResponse {
  qrCodeDataUrl: string;
  manualEntrySecret: string;
  confirm_pending_token: string;
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

// ── System Config ─────────────────────────────────────────────────────────────

export interface SystemConfig {
  id: number;
  navbarTitle: string;
  navbarImagePath: string | null;
  adminTabName: string;
  adminFaviconPath: string | null;
  publicTabName: string;
  publicFaviconPath: string | null;
  defaultGroupPrefix: string;
  defaultGroupSequence: string;
  publicTitle: string | null;
  publicImagePath: string | null;
  updatedAt: string;
}

export type UpdateSystemConfigPayload = Partial<Omit<SystemConfig, 'id' | 'updatedAt'>>;

// ── Default Categories ────────────────────────────────────────────────────────

export interface DefaultCategory {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

// ── Global Teams ──────────────────────────────────────────────────────────────

export interface GlobalTeam {
  id: string;
  name: string;
  abbreviation: string;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Raffles ───────────────────────────────────────────────────────────────────

export type RaffleStatus = 'pending' | 'configured' | 'in_progress' | 'finished';

export interface Raffle {
  id: string;
  name: string;
  status: RaffleStatus;
  publicSlug: string | null;
  drawSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetRafflesFilter {
  name?: string;
  sortByDate?: boolean;
}

// ── Raffle Teams ──────────────────────────────────────────────────────────────

export interface RaffleTeam {
  id: string;
  raffleId: string;
  name: string;
  abbreviation: string;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportGlobalTeamsPayload {
  globalTeamIds: string[];
}

// ── Sports ────────────────────────────────────────────────────────────────────

export interface Sport {
  id: string;
  raffleId: string;
  name: string;
  abbreviation: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SportCategory {
  id: string;
  sportId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface SportCategoryGroup {
  id: string;
  sportId: string;
  sportCategoryId: string | null;
  name: string;
  capacity: number;
  sortOrder: number;
  createdAt: string;
}

export interface SportCategoryTeam {
  id: string;
  sportId: string;
  sportCategoryId: string | null;
  raffleTeamId: string;
  raffleTeam: RaffleTeam;
}

export interface CreateGroupItem {
  name: string;
  capacity?: number;
}

export interface BulkCreateGroupsPayload {
  groups: CreateGroupItem[];
}

export interface AssignTeamPayload {
  raffleTeamId: string;
}

// ── Draw ──────────────────────────────────────────────────────────────────────

export type DrawPhase = 'idle' | 'picking_team' | 'picking_group';

export interface DrawResult {
  id: string;
  raffleId: string;
  sportCategoryGroupId: string;
  raffleTeamId: string;
  position: number;
  drawnAt: string;
  raffleTeam: RaffleTeam;
  sportCategoryGroup: SportCategoryGroup;
}

export interface DrawState {
  raffleId: string;
  currentSportId: string | null;
  currentSportCategoryId: string | null;
  drawnTeamId: string | null;
  phase: DrawPhase;
  lastDrawResultId: string | null;
  updatedAt: string;
  currentSport: Sport | null;
  currentSportCategory: SportCategory | null;
  drawnTeam: RaffleTeam | null;
}

export interface FullDrawState {
  state: DrawState | null;
  remainingTeams: RaffleTeam[];
  remainingGroups: SportCategoryGroup[];
  results: DrawResult[];
}

export interface SelectContextPayload {
  sportId: string;
  sportCategoryId?: string;
}

export interface DrawTeamResponse {
  team: RaffleTeam;
  state: DrawState | null;
}

export interface DrawGroupResponse {
  result: DrawResult;
  isDone: boolean;
}

// ── Respuestas Públicas ───────────────────────────────────────────────────────

export interface PublicGroupData extends SportCategoryGroup {
  results: DrawResult[];
}

export interface PublicSectionData {
  category: SportCategory | null;
  groups: PublicGroupData[];
}

export interface PublicSportData {
  sport: Sport;
  hasCategories: boolean;
  sections: PublicSectionData[];
}

export interface PublicResultsResponse {
  raffle: Raffle;
  sports: PublicSportData[];
}