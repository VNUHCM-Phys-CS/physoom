import Image from "next/image";
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth();
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <p>Welcome {session?.user?.email}!</p>
    </main>
  );
}
