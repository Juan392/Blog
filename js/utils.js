import { API_BASE_URL } from './config.js';

export function getProfilePicUrl(path) {
    if (path) {
        const backendOrigin = new URL(API_BASE_URL).origin;
        return `${backendOrigin}${path}`;
    }
    return 'default-profile.svg';
}

export async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        ...options
    };
    return fetch(url, defaultOptions);
}