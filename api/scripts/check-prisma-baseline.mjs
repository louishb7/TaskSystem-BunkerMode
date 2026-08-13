import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const schemaPath = path.resolve("prisma/schema.prisma")
const expectedPath = path.resolve("prisma/baseline.expected.json")

const schema = fs.readFileSync(schemaPath, "utf8")
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"))

const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)].map(
  ([, modelName, body]) => ({
    modelName,
    body,
    tableName: body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName,
  }),
)

if (modelBlocks.length === 0) {
  console.error(
    "Schema Prisma ainda nao tem modelos. Execute `npm run prisma:pull` com DATABASE_URL apontando para um banco baseline.",
  )
  process.exit(1)
}

const actualTables = new Map(
  modelBlocks.map((block) => {
    const fields = block.body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => {
        const [fieldName] = line.split(/\s+/)
        const mappedName = line.match(/@map\("([^"]+)"\)/)?.[1]
        return mappedName ?? fieldName
      })

    return [block.tableName, new Set(fields)]
  }),
)

const failures = []
const warnings = []

for (const [tableName, expectedColumns] of Object.entries(expected.tables)) {
  const actualColumns = actualTables.get(tableName)
  if (!actualColumns) {
    failures.push(`Tabela ausente no Prisma: ${tableName}`)
    continue
  }

  for (const columnName of expectedColumns) {
    if (!actualColumns.has(columnName)) {
      failures.push(`Coluna ausente no Prisma: ${tableName}.${columnName}`)
    }
  }
}

for (const indexName of expected.indexes ?? []) {
  if (!schema.includes(indexName)) {
    warnings.push(`Indice nao encontrado no schema Prisma introspectado: ${indexName}`)
  }
}

for (const constraintName of expected.constraints ?? []) {
  if (!schema.includes(constraintName)) {
    warnings.push(`Constraint exige revisao manual fora do Prisma Client: ${constraintName}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn(warnings.join("\n"))
}

console.log("Baseline Prisma cobre as tabelas e colunas esperadas do ORM SQLAlchemy.")
