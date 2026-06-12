export type User = {
  usuario_id: number;
  usuario: string;
  email: string;
  ativo?: boolean;
  nome_general?: string | null;
  active_mode?: "general" | "soldier";
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  usuario: User;
};
