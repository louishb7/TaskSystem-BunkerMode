import { api } from "./client";
import type { MountainResponse } from "@/types/mountain";

export function getMountain() {
  return api.get<MountainResponse>("/montanha");
}
