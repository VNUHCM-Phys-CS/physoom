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

export const { auth, handlers, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
      AzureADProvider({
        clientId: `${env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID}`,
        clientSecret: `${env.NEXT_PUBLIC_AZURE_AD_CLIENT_SECRET}`,
        tenantId: `${env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
        authorization: {
          params: { scope: 'openid email profile User.Read  offline_access' },
        },
        httpOptions: { timeout: 10000 },
      }),
        GoogleProvider({
          clientId: process.env.NEXT_GOOGLE_ID,
          clientSecret: process.env.NEXT_GOOGLE_SECRET,
        }),
        CredentialsProvider({
            async authorize(credentials) {
              try {
                const user = await login(credentials);
                return user;
              } catch (err) {
                return null;
              }
            },
          })],
          database: process.env.MONGODB_URI,
        callbacks: {
          async signIn({ user, account, profile }) {
            if (account.provider === "google") {
              // connectToDb();
              // try {
              //   const existingUser = await User.findOne({ email: user.email });
              //   if (!existingUser) {
              //     await User.insertOne({
              //       name: user.email,
              //       email: user.email,
              //       isAdmin: false,
              //     });
              //   }
              // } catch (err) {
              //   console.log(err);
              //   return false;
              // }
            }else 
            if (account.provider === "github") {
              connectToDb();
              try {
                const user = await User.findOne({ email: profile.email });
      
                if (!user) {
                  const newUser = new User({
                    username: profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                  });
      
                  await newUser.save();
                }
              } catch (err) {
                console.log(err);
                return false;
              }
            }
            return true;
          },
          async session({ session, token }) {
            console.log(session.user);
            console.log(token.user);
            if (token) {
              session.user = token.user;
              session.error = token.error;
              session.accessToken = token.accessToken;
              connectToDb();
              const existingUser = await User.findOne({ email: token.user.email });
              session.user.isAdmin = (existingUser && existingUser.isAdmin);
            }else {
              connectToDb();
              const existingUser = await User.findOne({ email: user.email });
              session.user.isAdmin = (existingUser && existingUser.isAdmin);
            }
            return session;
          },
          ...authConfig.callbacks,

        }
    // providers
})