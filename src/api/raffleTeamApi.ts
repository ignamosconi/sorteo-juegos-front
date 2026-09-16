import { apiClient } from './client';
import type { RaffleTeam, ImportGlobalTeamsPayload } from '@/types/api.types';

export const raffleTeamApi = {
  getByRaffle: (raffleId: string) =>
    apiClient.get<RaffleTeam[]>(`/raffles/${raffleId}/teams`).then(r => r.data),
  create: (raffleId: string, data: { name: string; abbreviation: string; imagePath?: string }) =>
    apiClient.post<RaffleTeam>(`/raffles/${raffleId}/teams`, data).then(r => r.data),
  importFromGlobal: (raffleId: string, globalTeamIds: string[]) =>
    apiClient.post<RaffleTeam[]>(`/raffles/${raffleId}/teams/import`, { globalTeamIds } as ImportGlobalTeamsPayload).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; abbreviation: string; imagePath: string }>) =>
    apiClient.patch<RaffleTeam>(`/raffle-teams/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/raffle-teams/${id}`),
};