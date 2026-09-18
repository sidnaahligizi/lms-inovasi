import { createClient } from '@libsql/client';

let clientInstance = null;

function getTursoClient() {
  if (!clientInstance) {
    const url = process.env.TURSO_MASTER_DATABASE_URL;
    const authToken = process.env.TURSO_MASTER_AUTH_TOKEN;

    // Mencegah error 'URL_INVALID' saat proses build di Vercel
    if (!url) {
      console.warn("Peringatan Build: TURSO_MASTER_DATABASE_URL belum terbaca.");
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

export const masterTurso = {
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
