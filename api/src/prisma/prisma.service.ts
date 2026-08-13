import { Injectable, OnModuleDestroy } from "@nestjs/common"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim()
    if (!connectionString) {
      throw new Error("Defina DATABASE_URL antes de executar o BunkerMode.")
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
