const isLocal = window.location.hostname === "127.0.0.1";

const currentConfig = {
  API_BASE_URL: isLocal
    ? "http://127.0.0.1:3000/api"
    : "https://tu-dominio-en-produccion.com/api",

  STATIC_BASE_URL: isLocal
    ? "http://127.0.0.1:3000"
    : "https://tu-dominio-en-produccion.com"
};

export const API_BASE_URL = currentConfig.API_BASE_URL;
export const STATIC_BASE_URL = currentConfig.STATIC_BASE_URL;
