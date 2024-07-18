import { inter } from "@/ui/font";
import "@/ui/globals.css";
import Nav from "@/ui/Nav/Nav";
import { AuthProvider } from "./Provider";

export const metadata = {
  title: "Presenation app",
  description: "Presentation app by zipexpo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex-col `}>
        <AuthProvider>
          <div className="flex-none">
            <Nav />
          </div>
          <div className="grow">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
