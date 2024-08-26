import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
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
  pages: {
    signIn: "/login",
  },
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
    // FOR MORE DETAIL ABOUT CALLBACK FUNCTIONS CHECK https://next-auth.js.org/configuration/callbacks
    authorized({ auth, request }) {
      const user = auth?.user;
      const isOnAdminPanel = request.nextUrl?.pathname.startsWith("/admin");
      const isOnBlogPage = request.nextUrl?.pathname.startsWith("/blog");
      const isOnLoginPage = request.nextUrl?.pathname.startsWith("/login");

      // ONLY ADMIN CAN REACH THE ADMIN DASHBOARD
      console.log(isOnAdminPanel, auth);
      if (isOnAdminPanel && !user?.isAdmin) {
        return false;
      }

      // ONLY AUTHENTICATED USERS CAN REACH THE BLOG PAGE

      if (isOnBlogPage && !user) {
        return false;
      }

      // ONLY UNAUTHENTICATED USERS CAN REACH THE LOGIN PAGE

      if (isOnLoginPage && user) {
        console.log("I am here!!!!!!");
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
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
      } else if (account.provider === "github") {
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
  },
};
