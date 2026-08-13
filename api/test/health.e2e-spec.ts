import { RequestMethod } from "@nestjs/common"
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants"

import { HealthController } from "../src/health.controller"

describe("HealthController", () => {
  const controller = new HealthController()

  it("returns the API v2 healthcheck", async () => {
    expect(controller.apiHealth()).toEqual({ status: "ok" })
    expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.apiHealth)).toBe(
      "api/v2/health",
    )
    expect(Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.apiHealth)).toBe(
      RequestMethod.GET,
    )
  })

  it("returns the root healthcheck", async () => {
    expect(controller.rootHealth()).toEqual({ status: "ok" })
    expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.rootHealth)).toBe(
      "health",
    )
    expect(Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.rootHealth)).toBe(
      RequestMethod.GET,
    )
  })
})
