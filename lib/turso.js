import { createClient } from '@libsql/client';

let masterInstance = null;

function getMasterClient() {
  if (!masterInstance) {
    const url = process.env.TURSO_MASTER_DATABASE_URL || process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_MASTER_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (!url) {
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

// Ekspor eksplisit 1: turso
export const turso = {
  execute: async (query, params = []) => {
    const db = getMasterClient();
    return await db.execute(typeof query === 'string' ? { sql: query, args: params } : query);
  },
  batch: async (queries) => {
    const db = getMasterClient();
    return await db.batch(queries);
  }
};

// Ekspor eksplisit 2: masterTurso
export const masterTurso = {
  execute: async (query, params = []) => {
    const db = getMasterClient();
    return await db.execute(typeof query === 'string' ? { sql: query, args: params } : query);
  },
  batch: async (queries) => {
    const db = getMasterClient();
    return await db.batch(queries);
  }
};

// Ekspor eksplisit 3: getTenantClient
export function getTenantClient(tenantUrl, tenantAuthToken) {
  if (!tenantUrl) {
    return { execute: async () => ({ rows: [] }), batch: async () => ([]) };
  }
  return createClient({
    url: tenantUrl,
    authToken: tenantAuthToken
  });
}
