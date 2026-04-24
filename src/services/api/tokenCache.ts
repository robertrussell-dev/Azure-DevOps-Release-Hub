import * as SDK from "azure-devops-extension-sdk";

// Token cache with expiration
interface TokenCache {
  token: string;
  expires: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_BUFFER_MS = 60000; // Refresh token 1 minute before expiry

// Get a cached token or fetch a fresh one
export const getCachedAccessToken = async (): Promise<string> => {
  const now = Date.now();
  
  // Return cached token if it's still valid
  if (tokenCache && now < tokenCache.expires) {
    return tokenCache.token;
  }
  
  // Fetch fresh token
  const token = await SDK.getAccessToken();
  
  // Cache it for 30 minutes (tokens typically last 1 hour)
  tokenCache = {
    token,
    expires: now + (30 * 60 * 1000) - TOKEN_BUFFER_MS
  };
  
  return token;
};

// Clear the cache (useful for testing or auth errors)
export const clearTokenCache = (): void => {
  tokenCache = null;
};
