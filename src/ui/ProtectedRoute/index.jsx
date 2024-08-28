import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

const ProtectedRoute = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>; // Optional: Show a loading indicator while checking session
  }

  if (status === "authenticated") {
    return children;
  }

  // Optional: Render nothing while redirecting
  return null;
};

export default ProtectedRoute;
