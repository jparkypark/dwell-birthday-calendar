import { verifySlackSignature } from '../utils/crypto';
import { Env } from '../index';

export async function verifySlackRequest(
  request: Request,
  env: Env,
  body: string
): Promise<boolean> {
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  const signature = request.headers.get('X-Slack-Signature');
  
  if (!timestamp || !signature || !env.SLACK_SIGNING_SECRET) {
    return false;
  }

  return await verifySlackSignature(body, timestamp, signature, env.SLACK_SIGNING_SECRET);
}

export function createSlackVerificationMiddleware() {
  return async (request: Request, env: Env, body: string) => {
    const isValid = await verifySlackRequest(request, env, body);
    
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    return null;
  };
}