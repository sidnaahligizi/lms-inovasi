import { createClient } from '@libsql/client';

function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_CONNECTION_URL || process.env.TURSO_MASTER_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_MASTER_AUTH_TOKEN;

  // Jika URL dan Token tersedia, buat koneksi nyata ke Turso
  if (url && authToken) {
    return createClient({ url, authToken });
  }

  // Jika tidak ada, paksa sistem memberikan error keras (BUKAN silent fail)
  return {
    execute: async () => { throw new Error("Koneksi Gagal: Variabel TURSO_DATABASE_URL tidak ditemukan di Vercel!"); },
    batch: async () => { throw new Error("Koneksi Gagal: Variabel TURSO_DATABASE_URL tidak ditemukan di Vercel!"); }
  };
}

export const turso = {
  execute: async (query, args) => await getDbClient().execute(typeof query === 'string' ? { sql: query, args: args || [] } : query),
  batch: async (queries) => await getDbClient().batch(queries)
};

export const masterTurso = turso;
export function getTenantClient() { return turso; }
