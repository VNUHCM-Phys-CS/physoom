import { inter } from "@/ui/font";
import "@/ui/globals.scss";
import Nav from "@/ui/Nav/Nav";
import { AuthProvider } from "./Provider";
import { HeroUIProvider } from "@heroui/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import the styles

export const metadata = {
  title: "Physoom app",
  description: "Physoom app by zipexpo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex-col `}>
        <HeroUIProvider>
          <AuthProvider>
            <div className="flex-none">
              <Nav />
            </div>
            <div className="grow">{children}</div>
            <ToastContainer />
          </AuthProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}
