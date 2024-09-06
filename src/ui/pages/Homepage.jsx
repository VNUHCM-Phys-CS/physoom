"use client";
import { Button } from "@nextui-org/react";
import { signIn, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  return (
    <main className="flex flex-col items-center justify-between p-24 prose m-auto">
      {session?.user?<><div className="flex items-end"><h1 className="m-0">Welcome </h1><h6 className="m-0 ml-2">{session?.user?.name}!</h6></div>
      <h3>
        Start to book your course with <b>Booking</b> Tab
      </h3></>:<>
          <h1>Start to use schedule</h1>
          <Button color="primary" variant="ghost" onClick={() => signIn("google")}>Login</Button>
      </>}
    </main>
  );
}
