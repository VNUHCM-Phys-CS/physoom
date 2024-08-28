import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
// import AzureADProvider from "next-auth/providers/azure-ad";
// import User from "@/models/user";
// import { connectToDb } from "./mongodb";
const env = process.env;

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    async verify(token) {
      const decodedToken = await JWT.decode({ token });
      // Verify token validity and user information
      return decodedToken;
    },
    signing: true, // Enable token signing if needed
  },
  session: { strategy: "jwt" },
  // pages: {
  //   signIn: "/login",
  // },
  providers: [
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
    }),
  ],
  database: process.env.MONGODB_URI,
  callbacks: {
  },
};
