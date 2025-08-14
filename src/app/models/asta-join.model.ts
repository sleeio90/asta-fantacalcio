export interface AstaJoinRequest {
  codiceInvito: string;
  nomeTeam: string;
  userId: string;
  userEmail: string;
}

export interface AstaJoinResponse {
  success: boolean;
  message: string;
  asta?: any;
}
