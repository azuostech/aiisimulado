import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Geração e validação do client não precisam de uma conexão ativa.
    // Comandos que acessam o banco falham sem uma URL real.
    url: process.env.DATABASE_URL ?? "",
  },
});
