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
 
const login = async (credentials) => {
    try {
      connectToDb();
      const user = await User.findOne({ username: credentials.username });
  
      if (!user) throw new Error("Wrong credentials!");
  
      const isPasswordCorrect = await bcrypt.compare(
        credentials.password,
        user.password
      );
  
      if (!isPasswordCorrect) throw new Error("Wrong credentials!");
  
      return user;
    } catch (err) {
      console.log(err);
      throw new Error("Failed to login!");
    }
  };

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
    if (token.user&&token.user.email) {
      connectToDb();
      const existingUser = await User.findOne({ email: token.user.email });
      const isAdmin = (existingUser && existingUser.isAdmin);
      token.isAdmin = isAdmin;
    }
    // if (Date.now() < token.accessTokenExpires - 100000 || 0) {
    //   return token;
    // }
    // return refreshAccessToken(token);
    return token;
  },
  ...authConfig.callbacks
}})