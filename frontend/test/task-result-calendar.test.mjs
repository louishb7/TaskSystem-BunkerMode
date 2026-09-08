import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/features/calendar/calendarUtils.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports, require() { return { formatDateForApi: (date) => `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}` } } })

for (const field of ["completed_at", "failed_at"]) {
  test(`${field}: seleção usa dia local do resultado e preserva prazo civil`, () => {
    const selected = new Date(2026, 8, 8)
    const onDay = (instant, timezone = "America/Recife") => exports.taskBelongsToDate({ prazo: "01-01-2026", [field]: instant }, selected, timezone)
    assert.equal(onDay("2026-09-08T15:00:00Z"), true)
    assert.equal(onDay("2026-09-09T01:00:00Z"), true)
    assert.equal(onDay("2026-09-09T03:01:00Z"), false)
    assert.equal(onDay("2026-09-07T10:01:00Z", "Pacific/Kiritimati"), true)
    assert.equal(onDay("2026-09-08T10:01:00Z", "Pacific/Kiritimati"), false)
    assert.equal(exports.taskBelongsToDate({ prazo: "08-09-2026" }, selected, "America/Recife"), true)
    assert.equal(exports.taskBelongsToDate({ prazo: "2026-09-08" }, selected, "Pacific/Kiritimati"), true)
    assert.equal(onDay("inválido"), false)
  })
}
