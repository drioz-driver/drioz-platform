import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db } from './db.js';
export type Actor = { id: string; role: 'customer'|'driver'|'admin' };
let keys: ReturnType<typeof createRemoteJWKSet>;
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1];
    if (!token) throw new UnauthorizedException();
    let sub: string;
    try {
      keys ??= createRemoteJWKSet(new URL(process.env.OIDC_JWKS_URL!));
      const { payload } = await jwtVerify(token, keys, { issuer: process.env.OIDC_ISSUER, audience: process.env.OIDC_AUDIENCE, algorithms: ['RS256','ES256'] });
      if (!payload.sub) throw new Error('Missing subject');
      sub = payload.sub;
    } catch { throw new UnauthorizedException('Invalid or expired access token'); }
    // Roles come from the database, never from client input or untrusted JWT metadata.
    const { rows } = await db.query('SELECT id, role FROM users WHERE oidc_subject=$1 AND disabled=false', [sub]);
    if (!rows[0]) throw new ForbiddenException('Account onboarding required');
    req.actor = rows[0] satisfies Actor;
    return true;
  }
}
export function requireRole(actor: Actor, ...roles: Actor['role'][]) { if (!roles.includes(actor.role)) throw new ForbiddenException(); }
