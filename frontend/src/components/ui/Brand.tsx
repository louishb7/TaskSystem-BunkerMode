import React from "react"

export default function Brand({ large = false, compact = false }) {
  return (
    <span
      role="img"
      className={`inline-flex shrink-0 items-center ${large ? "flex-col gap-5" : "gap-2.5"}`}
      aria-label="BunkerMode"
    >
      <span
        className={`relative block shrink-0 overflow-hidden ${large ? "size-40" : compact ? "size-8" : "size-10"}`}
      >
        <img
          src="/faviconbg.png"
          alt=""
          className="absolute top-1/2 left-1/2 block h-[140%] w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      </span>
      <span
        aria-hidden="true"
        className={`${large ? "text-3xl" : compact ? "text-base" : "text-xl"} font-bold tracking-tight text-text-primary`}
      >
        Bunker<span className="font-medium text-accent">Mode</span>
      </span>
    </span>
  )
}
