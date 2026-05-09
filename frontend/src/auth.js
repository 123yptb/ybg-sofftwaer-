import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // Find user in local SQLite database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { organization: true },
          });

          if (!user || !user.password) {
            console.error('User not found or has no password');
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.error('Invalid password for user:', credentials.email);
            return null;
          }

          return {
            id:             user.id,
            name:           user.name || user.email,
            email:          user.email,
            organizationId: user.organizationId,
            tenantId:       user.organizationId,
            role:           user.role,
            businessType:   user.organization?.businessType || 'TRADING',
            accessToken:    'local-monolithic-session',
          };
        } catch (error) {
          console.error('Local Auth Error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id             = user.id;
        token.organizationId = user.organizationId;
        token.tenantId       = user.organizationId;
        token.role           = user.role;
        token.accessToken    = user.accessToken;
        token.businessType   = user.businessType || 'TRADING';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id             = token.id;
        session.user.organizationId = token.organizationId;
        session.user.tenantId       = token.tenantId;
        session.user.role           = token.role;
        session.user.accessToken    = token.accessToken;
        session.user.businessType   = token.businessType || 'TRADING';
      }
      return session;
    },
  },
});
