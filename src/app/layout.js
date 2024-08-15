import { inter } from "@/ui/font";
import "@/ui/globals.css";
import Nav from "@/ui/Nav/Nav";
import { AuthProvider } from "./Provider";
import { NextUIProvider } from "@nextui-org/react";

export const metadata = {
  title: "Physoom app",
  description: "Physoom app by zipexpo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex-col `}>
        <NextUIProvider>
          <AuthProvider>
            <div className="flex-none">
              <Nav />
            </div>
            <div className="grow">{children}</div>
          </AuthProvider>
        </NextUIProvider>
      </body>
    </html>
  );
}
