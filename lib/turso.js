import { createClient } from '@libsql/client';

let clientInstance = null;

function getTursoClient() {
  if (!clientInstance) {
    const url = process.env.TURSO_MASTER_DATABASE_URL || process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_MASTER_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      console.warn("Peringatan: Variabel URL Database belum terbaca saat proses build.");
      return {
        execute: async () => ({ rows: [] }),
        batch: async () => ([])
      };
    }

    clientInstance = createClient({
      url: url,
      authToken: authToken,
    });
  }
  return clientInstance;
}

export const turso = {
  execute: async (query, params = []) => {
    const db = getTursoClient();
    return await db.execute(
      typeof query === 'string' ? { sql: query, args: params } : query
    );
  },
  batch: async (queries) => {
    const db = getTursoClient();
    return await db.batch(queries);
  }
};
