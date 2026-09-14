import { apiClient } from './client';
import type {
  FullDrawState,
  Raffle,
  SelectContextPayload,
  DrawTeamResponse,
  DrawGroupResponse,
  PublicResultsResponse,
} from '@/types/api.types';
import axios from 'axios';
import { ENV } from '@/config/env';

export const drawApi = {
  getState: (raffleId: string) =>
    apiClient.get<FullDrawState>(`/draw/${raffleId}/state`).then(r => r.data),
  selectContext: (raffleId: string, sportId: string, sportCategoryId?: string) =>
    apiClient.post<FullDrawState>(`/draw/${raffleId}/select-context`, { sportId, sportCategoryId } as SelectContextPayload).then(r => r.data),
  drawTeam: (raffleId: string) =>
    apiClient.post<DrawTeamResponse>(`/draw/${raffleId}/draw-team`).then(r => r.data),
  drawGroup: (raffleId: string) =>
    apiClient.post<DrawGroupResponse>(`/draw/${raffleId}/draw-group`).then(r => r.data),
  undo: (raffleId: string) =>
    apiClient.post<FullDrawState>(`/draw/${raffleId}/undo`).then(r => r.data),
  getByDrawSlug: (drawSlug: string) =>
    apiClient.get<Raffle>(`/draw/by-slug/${drawSlug}`).then(r => r.data),
  getPublicResults: (publicSlug: string) =>
    axios.get<PublicResultsResponse>(`${ENV.API_BASE_URL}/public/${publicSlug}`).then(r => r.data),
};