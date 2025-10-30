import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth, signIn, signOut, handlers } = NextAuth(authConfig);

export { auth, signIn, signOut, handlers };
