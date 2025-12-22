import axios, { AxiosHeaders, AxiosError } from "axios";
import { getEnv } from "@/lib/env-validation";

const env = getEnv();
const vybeDomain = env.NEXT_PUBLIC_VYBE_INTEGRATIONS_DOMAIN ?? "https://vybe.build";

// Validate required environment variables
if (!env.VYBE_SERVER_SECRET) {
  throw new Error('VYBE_SERVER_SECRET environment variable is required');
}

export const internalDbClient = axios.create({
  baseURL: vybeDomain + "/api/database",
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'AgentsFlowAI/1.0'
  }
});

// Request interceptor with enhanced security
internalDbClient.interceptors.request.use(
  (config) => {
    // Add server secret for authentication
    const headers = AxiosHeaders.from(config.headers);
    headers.set("VYBE_SERVER_SECRET", env.VYBE_SERVER_SECRET);
    
    // Add request timestamp for debugging
    headers.set("X-Request-Timestamp", new Date().toISOString());
    
    // Add request ID for tracing
    headers.set("X-Request-ID", generateRequestId());
    
    config.headers = headers;
    
    // Log request for audit trail
    console.log(`[VYBE API] ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('[VYBE API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with error handling and retry logic
internalDbClient.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`[VYBE API] Response ${response.status} for ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Log error for audit trail
    console.error(`[VYBE API] Error ${error.response?.status} for ${originalRequest?.url}:`, error.message);
    
    // Implement retry logic for network errors and 5xx responses
    if (!originalRequest || shouldRetry(error)) {
      const maxRetries = 3;
      const retryCount = originalRequest._retryCount || 0;
      
      if (retryCount < maxRetries) {
        originalRequest._retryCount = retryCount + 1;
        
        // Exponential backoff delay
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[VYBE API] Retrying request (${retryCount + 1}/${maxRetries}) for ${originalRequest.url}`);
        return internalDbClient(originalRequest);
      }
    }
    
    // Handle specific error types
    if (error.response?.status === 401) {
      throw new Error('Authentication failed: Invalid VYBE_SERVER_SECRET');
    } else if (error.response?.status === 403) {
      throw new Error('Access forbidden: Insufficient permissions');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded: Too many requests to vybe.build API');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error: Unable to connect to vybe.build API');
    } else if (error.response?.status && error.response.status >= 500) {
      throw new Error(`Server error: vybe.build API returned ${error.response.status}`);
    }
    
    throw new Error(`API request failed: ${error.message}`);
  }
);

// Helper function to determine if request should be retried
function shouldRetry(error: AxiosError): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  return !error.response ||
         error.code === 'ENOTFOUND' ||
         error.code === 'ECONNABORTED' ||
         (error.response.status >= 500 && error.response.status < 600);
}

// Helper function to generate unique request ID
function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}
