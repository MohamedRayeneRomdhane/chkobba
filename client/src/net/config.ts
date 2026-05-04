type ImportMetaEnv = {
  VITE_SERVER_URL?: string;
  DEV?: boolean;
};

const env = (import.meta as unknown as { env: ImportMetaEnv }).env;

export const SERVER_URL: string =
  env.VITE_SERVER_URL || (env.DEV ? 'http://localhost:3001' : 'https://chkobba-5zq3.onrender.com');

export const SOCKET_TIMEOUT_MS = 8_000;
