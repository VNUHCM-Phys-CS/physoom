import NextAuth from "next-auth";
import User from "@/models/user";
// import GitHub from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import {authConfig} from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import {connectToDb} from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import AzureADProvider from 'next-auth/providers/azure-ad';
const env = process.env;


export const { auth, handlers, signIn, signOut } = NextAuth({...authConfig,callbacks:{
  async session({ session, token }) {
    if (token) {
      session.isAdmin = token.isAdmin;
      session.user = token.user;
      session.user.isAdmin = token.isAdmin;
      session.error = token.error;
      session.accessToken = token.accessToken;
    }
    return session;
  },
  async jwt({ token, user, account }) {
    if (user) {
      token.user = user;
      token.isAdmin = user.isAdmin;
    }
    // if (token.user&&token.user.email) {
    //   const isAdmin = user.isAdmin;
    //   token.isAdmin = isAdmin;
    // }
    // if (Date.now() < token.accessTokenExpires - 100000 || 0) {
    //   return token;
    // }
    // return refreshAccessToken(token);
    return token;
  },
  async signIn({ user, account, profile }) {
    if (account.provider === "google") {
      await connectToDb();
      const existingUser = await User.findOne({ email: user.email });
      const isAdmin = (existingUser && existingUser.isAdmin);
      user.isAdmin = isAdmin;
    }
    return true;
  },
  ...authConfig.callbacks
}})