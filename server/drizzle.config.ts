import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` compares the schema with the migrations and writes the next one. It needs no database.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
