import { Env } from '../index';
import { AppError } from './error-handler';

export async function verifyAdminAuth(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  if (!env.ADMIN_PASSWORD) {
    throw new AppError('Admin password not configured', 500);
  }
  
  try {
    const base64Credentials = authHeader.slice(6); // Remove 'Basic ' prefix
    // Using global atob function available in Cloudflare Workers
    const credentials = globalThis.atob(base64Credentials);
    const [username, password] = credentials.split(':');
    
    // Username is hardcoded as 'admin' for simplicity
    return username === 'admin' && password === env.ADMIN_PASSWORD;
  } catch {
    // Invalid base64 or malformed credentials
    return false;
  }
}

export function createAdminAuthMiddleware() {
  return async (request: Request, env: Env) => {
    const isValid = await verifyAdminAuth(request, env);
    
    if (!isValid) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Access"',
          'Content-Type': 'text/plain'
        }
      });
    }
    
    return null;
  };
}