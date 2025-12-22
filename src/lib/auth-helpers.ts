import { getServerSession } from "better-auth/node";
import { NextRequest } from "next/server";
import { getEnv } from "./env-validation";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extract and verify session from request headers
 */
export async function getServerSessionFromRequest(request: NextRequest): Promise<AuthResult> {
  const env = getEnv();
  
  // Check for development mode bypass
  if (env.NODE_ENV === 'development' && 
      env.NEXT_PUBLIC_DEV_USER_NAME && 
      env.NEXT_PUBLIC_DEV_USER_EMAIL) {
    return {
      authenticated: true,
      user: {
        id: 'dev-user',
        name: env.NEXT_PUBLIC_DEV_USER_NAME,
        email: env.NEXT_PUBLIC_DEV_USER_EMAIL,
        image: env.NEXT_PUBLIC_DEV_USER_IMAGE
      }
    };
  }

  try {
    // Extract session from request
    const session = await getServerSession(request);
    
    if (!session) {
      return {
        authenticated: false,
        error: 'No session found'
      };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image
      }
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    return {
      authenticated: false,
      error: 'Session verification failed'
    };
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const authResult = await getServerSessionFromRequest(request);
  
  if (!authResult.authenticated || !authResult.user) {
    throw new Error(authResult.error || 'Authentication required');
  }

  return authResult.user;
}

/**
 * Get user from request, returns null if not authenticated
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authResult = await getServerSessionFromRequest(request);
  return authResult.authenticated ? authResult.user || null : null;
}

/**
 * Check if request is from Inngest (for webhook routes)
 */
export function isInngestRequest(request: NextRequest): boolean {
  const env = getEnv();
  const inngestKey = request.headers.get('x-inngest-signature');
  
  if (!inngestKey || !env.INNGEST_SIGNING_KEY) {
    return false;
  }

  // Basic signature verification (Inngest would have more sophisticated verification)
  return inngestKey === env.INNGEST_SIGNING_KEY;
}