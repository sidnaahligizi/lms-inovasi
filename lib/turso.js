import { createClient } from '@libsql/client';

let masterInstance = null;

// Fungsi pelindung agar Vercel tidak error saat proses build
function getMasterClient() {
  if (!masterInstance) {
    const url = process.env.TURSO_MASTER_DATABASE_URL || process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_MASTER_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      console.warn("Peringatan: Variabel URL Database belum terbaca saat proses build.");
      return {
        execute: async () => ({ rows: [] }),
        batch: async () => ([])
      };
    }

    masterInstance = createClient({
      url: url,
      authToken: authToken,
    });
  }
  return masterInstance;
}

// EKSPOR UTAMA: 'turso' (untuk mengakomodasi file route-4.js)
export const turso = {
  execute: async (query, params = []) => {
    const db = getMasterClient();
    return await db.execute(
      typeof query === 'string' ? { sql: query, args: params } : query
    );
  },
  batch: async (queries) => {
    const db = getMasterClient();
    return await db.batch(queries);
  }
};

// EKSPOR TAMBAHAN: 'masterTurso' (untuk mengakomodasi file login/route.js)
export const masterTurso = turso;

// EKSPOR TENANT: 'getTenantClient' (wajib ada agar Turbopack tidak error)
export function getTenantClient(tenantUrl, tenantAuthToken) {
  if (!tenantUrl) {
    return { 
      execute: async () => ({ rows: [] }), 
      batch: async () => ([]) 
    };
  }

  return createClient({
    url: tenantUrl,
    authToken: tenantAuthToken
  });
}
