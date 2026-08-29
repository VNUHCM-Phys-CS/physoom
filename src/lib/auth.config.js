import GoogleProvider from "next-auth/providers/google";
// import AzureADProvider from "next-auth/providers/azure-ad";
// import User from "@/models/user";
// import { connectToDb } from "./mongodb";
const env = process.env;

export const authConfig = {
  secret: env.NEXTAUTH_SECRET,
  jwt: {
    secret: env.NEXTAUTH_SECRET,
    maxAge: 24*60 * 60,
    async verify(token) {
      const decodedToken = await JWT.decode({ token });
      // Verify token validity and user information
      return decodedToken;
    },
    signing: true, // Enable token signing if needed
  },
  session: { strategy: "jwt" },
  // Dùng trang đăng nhập có thương hiệu thay cho trang mặc định trơ trụi của
  // NextAuth. Mọi lối vào đăng nhập (kể cả luồng SSO /api/sso/authorize khi chưa
  // đăng nhập) đều đưa về đây, kèm callbackUrl để quay lại đúng chỗ.
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: env.NEXT_GOOGLE_ID,
      clientSecret: env.NEXT_GOOGLE_SECRET,
    }),
  ],
  database: process.env.MONGODB_URI,
  callbacks: {},
};
