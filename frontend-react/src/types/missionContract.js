const REQUIRED_PERMISSION_KEYS = Object.freeze([
  "can_complete",
  "can_edit",
  "can_delete",
  "can_toggle_decided",
  "can_justify",
  "can_review",
  "can_view_history",
]);

function buildContractError(message) {
  return new Error(`Contrato inválido: ${message}`);
}

export function assertMissionContract(mission) {
  if (!mission || typeof mission !== "object") {
    throw buildContractError("missão ausente ou inválida");
  }

  if (!mission.status_code) {
    throw buildContractError("missão sem status_code");
  }

  if (!mission.status_label) {
    throw buildContractError("missão sem status_label");
  }

  if (!mission.permissions || typeof mission.permissions !== "object") {
    throw buildContractError("missão sem permissions");
  }

  for (const key of REQUIRED_PERMISSION_KEYS) {
    if (typeof mission.permissions[key] !== "boolean") {
      throw buildContractError(`permissions.${key} ausente ou não booleano`);
    }
  }

  return mission;
}

export function assertMissionListContract(missions) {
  if (!Array.isArray(missions)) {
    throw buildContractError("lista de missões inválida");
  }

  return missions.map(assertMissionContract);
}
