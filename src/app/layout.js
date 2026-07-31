import { inter } from "@/ui/font";
import "@/ui/globals.scss";
import Nav from "@/ui/Nav/Nav";
import AnimatedBackground from "@/ui/AnimatedBackground";
import { AuthProvider } from "./Provider";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import the styles
import { Providers } from "@/ui/providers";
import { I18nProvider } from "@/i18n/I18nProvider";
import PwaRegister from "@/ui/PwaRegister";

export const metadata = {
  title: "Physoom app",
  description: "Hệ thống đặt phòng & lịch học — Khoa Vật lý VNU-HCMUS",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Physoom", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex-col `}>
        <Providers>
          <I18nProvider>
          <AuthProvider>
            <PwaRegister />
            <AnimatedBackground />
            <div className="flex-none">
              <Nav />
            </div>
            <div className="grow">{children}</div>
            <ToastContainer />
          </AuthProvider>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
