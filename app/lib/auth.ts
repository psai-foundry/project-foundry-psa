
import { getServerSession } from 'next-auth/next';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔍 Authorize called with:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password 
        });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        console.log('🔍 Looking up user:', credentials.email);
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          }
        });

        if (!user) {
          console.log('❌ User not found');
          return null;
        }
        
        if (!user.password) {
          console.log('❌ User has no password');
          return null;
        }

        console.log('🔍 Validating password for user:', user.email);
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log('🔍 Password validation result:', isPasswordValid);
        if (!isPasswordValid) {
          console.log('❌ Invalid password');
          return null;
        }

        console.log('✅ Authentication successful for:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export const getServerAuth = () => getServerSession(authOptions);
