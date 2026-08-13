import { HttpException } from "@nestjs/common"

import { AuthRateLimitService } from "../src/auth/rate-limit.service"

describe("AuthRateLimitService", () => {
  it("blocks requests after the configured limit within the window", () => {
    const rateLimit = new AuthRateLimitService()

    rateLimit.check("login:127.0.0.1", 2, 60_000)
    rateLimit.check("login:127.0.0.1", 2, 60_000)

    expect(() => rateLimit.check("login:127.0.0.1", 2, 60_000)).toThrow(HttpException)
  })

  it("keeps independent buckets per route and client key", () => {
    const rateLimit = new AuthRateLimitService()

    rateLimit.check("login:127.0.0.1", 1, 60_000)
    rateLimit.check("register:127.0.0.1", 1, 60_000)
    rateLimit.check("login:127.0.0.2", 1, 60_000)

    expect(() => rateLimit.check("login:127.0.0.1", 1, 60_000)).toThrow(HttpException)
    expect(() => rateLimit.check("register:127.0.0.1", 1, 60_000)).toThrow(HttpException)
    expect(() => rateLimit.check("login:127.0.0.2", 1, 60_000)).toThrow(HttpException)
  })
})
