from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class MissionPermissions:
    can_complete: bool
    can_edit: bool
    can_delete: bool
    can_toggle_decided: bool
    can_justify: bool
    can_review: bool
    can_view_history: bool

    def to_dict(self) -> dict:
        return asdict(self)
