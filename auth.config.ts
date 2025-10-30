import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn && isOnLogin) {
        return Response.redirect(new URL('/', nextUrl));
      }
      return true;
    },
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'admin' },
        password: { label: 'Password', type: 'password', placeholder: 'admin123' },
      },
      async authorize(credentials) {
        console.log('Received credentials:', credentials); // 👈 debug line

        if (
          credentials?.username === 'admin' &&
          credentials?.password === 'admin123'
        ) {
          return {
            id: '1',
            name: 'CONTI CONTI',
            email: 'admin@ascent.com',
            role: 'operator',
          };
        }
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
