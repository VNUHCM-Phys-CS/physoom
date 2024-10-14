import NextAuth from "next-auth";
import User from "@/models/user";
// import GitHub from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { authConfig } from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import AzureADProvider from "next-auth/providers/azure-ad";
const env = process.env;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async session({ session, token }) {
      session.token = token;
      if (token) {
        session.isAdmin = token.isAdmin;
        session.teacher_id = token.teacher_id;
        session.user = token.user;
        session.user.isAdmin = token.isAdmin;
        session.user.teacher_id = token.teacher_id;
        session.error = token.error;
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.accessToken;
        token.accessTokenExpires = Date.now() + account.expires_in * 1000;
      }
      if (user) {
        token.user = user;
        token.isAdmin = user.isAdmin;
        token.teacher_id = user.teacher_id;
      }
      // if (token.user&&token.user.email) {
      //   const isAdmin = user.isAdmin;
      //   token.isAdmin = isAdmin;
      // }
      // if (Date.now() < token.accessTokenExpires - 100000 || 0) {
      //   return token;
      // }
      // return refreshAccessToken(token);
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }
      // Refresh the token
      try {
        const refreshedToken = await refreshAccessToken(token);
        return {
          ...token,
          accessToken: refreshedToken.accessToken,
          accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        await connectToDb();
        const existingUser = await User.findOne({ email: user.email });
        const isAdmin = existingUser && existingUser.isAdmin;
        const teacher_id = existingUser && existingUser.teacher_id;
        user.isAdmin = isAdmin;
        user.teacher_id = teacher_id;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Redirect logic after sign-in
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
    ...authConfig.callbacks,
  },
});

async function refreshAccessToken(token) {
  // Implement your logic to refresh the token
  return {
    accessToken: "newAccessToken",
    expires_in: 86400,
  };
}
