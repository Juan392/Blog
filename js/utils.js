import { API_BASE_URL } from './config.js';

export function getProfilePicUrl(path) {
    console.log(`Resolviendo URL para path: ${path}`);
    if (path) {
        const backendOrigin = new URL(API_BASE_URL).origin;
        return `${backendOrigin}${path}`;
    }
    return 'default-profile.svg';
}