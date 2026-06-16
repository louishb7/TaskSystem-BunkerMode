import { api } from "./client";
import type { LoginPayload, LoginResponse, SessionMode, User } from "@/types/auth";

export function login(payload: LoginPayload) {
  return api.post<LoginResponse>("/auth/login", payload);
}

export function getCurrentUser() {
  return api.get<User>("/usuarios/me");
}

export function setSessionMode(mode: SessionMode) {
  return api.patch<User>("/session/mode", { mode });
}
