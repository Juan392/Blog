const isLocal = window.location.hostname === "https://blog-production-bfac.up.railway.app";

const currentConfig = {
  API_BASE_URL: isLocal
    ? "http://127.0.0.1:3000/api"
    : "https://blog-production-bfac.up.railway.app/api",

  STATIC_BASE_URL: isLocal
    ? "http://127.0.0.1:3000"
    : "https://blog-production-bfac.up.railway.app"
};

export const API_BASE_URL = currentConfig.API_BASE_URL;
export const STATIC_BASE_URL = currentConfig.STATIC_BASE_URL;
