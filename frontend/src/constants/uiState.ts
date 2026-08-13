export type StatusType = "muted" | "success" | "error"

export type UiStatus = {
  type: StatusType
  message: string
}

export const emptyStatus: Readonly<UiStatus> = Object.freeze({ type: "muted", message: "" })
