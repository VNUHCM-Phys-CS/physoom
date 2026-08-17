import NextAuth from "next-auth";
import User from "@/models/user";
import Room from "@/models/room";
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
        session.user.isSuperAdmin = token.isSuperAdmin;
        session.user.adminScope = token.adminScope || [];
        session.user.teacher_id = token.teacher_id;
        session.user.isRoomManager = !!token.isRoomManager;
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
        token.isSuperAdmin = !!user.isSuperAdmin;
        token.adminScope = Array.isArray(user.adminScope) ? user.adminScope.map((s) => String(s)) : [];
        token.teacher_id = user.teacher_id;
      }

      // Always refresh role/scope from the DB so role changes (grant super,
      // set a scope, backfills) take effect on the next request WITHOUT a
      // re-login — and old tokens issued before these fields existed get them
      // populated. Best-effort; never break auth on a DB hiccup.
      if (token?.user?.email) {
        try {
          await connectToDb();
          const dbUser = await User.findOne(
            { email: token.user.email },
            "isAdmin isSuperAdmin adminScope teacher_id"
          ).lean();
          if (dbUser) {
            token.isAdmin = !!dbUser.isAdmin;
            token.isSuperAdmin = !!dbUser.isSuperAdmin;
            token.adminScope = Array.isArray(dbUser.adminScope) ? dbUser.adminScope.map((s) => String(s)) : [];
            token.teacher_id = dbUser.teacher_id;
            token.user.isAdmin = token.isAdmin;
            token.user.isSuperAdmin = token.isSuperAdmin;
            token.user.adminScope = token.adminScope;
            token.user.teacher_id = token.teacher_id;
            // Room-manager status: true only if this user manages at least one
            // room. Refreshed every request (like roles) so granting/revoking a
            // manager takes effect without a re-login. Drives the "Quản lý phòng"
            // nav link — which must NOT show for ordinary lecturers.
            try {
              const managedCount = await Room.countDocuments({ managers: token.user.email });
              token.isRoomManager = managedCount > 0;
              token.user.isRoomManager = token.isRoomManager;
            } catch {
              token.isRoomManager = token.isRoomManager || false;
            }
          }
        } catch (e) {
          console.error("jwt role refresh failed", e);
        }
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
        user.isSuperAdmin = !!existingUser?.isSuperAdmin;
        // Plain array of strings — a Mongoose document array can't be structured-
        // cloned by the JWT encoder (DataCloneError).
        user.adminScope = Array.isArray(existingUser?.adminScope)
          ? existingUser.adminScope.map((s) => String(s))
          : [];
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
