import type { NextAuthOptions } from 'next-auth';
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 3600 },
  providers: [{ id:'drioz', name:'DRIOZ',type:'oauth',wellKnown:`${process.env.OIDC_ISSUER?.replace(/\/$/,'')}/.well-known/openid-configuration`,clientId:process.env.OIDC_CLIENT_ID,clientSecret:process.env.OIDC_CLIENT_SECRET,idToken:true,checks:['pkce','state'],authorization:{params:{scope:'openid profile email'}},profile(profile){return {id:profile.sub,name:profile.name,email:profile.email}} }],
  callbacks: {
    async jwt({token,account}) {
      if(account){token.apiToken=account.access_token;token.apiExpiresAt=account.expires_at;}
      return token;
    },
    async session({session}) { return session; }
  }
};
