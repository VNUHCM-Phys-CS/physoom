import { Suspense } from "react";
import BreadcrumbsHeader from "@/ui/BreadcrumsHeader";

export default function Layout({ children }) {
  return (
    <>
      <Suspense fallback={null}>
        <BreadcrumbsHeader />
      </Suspense>
      <div>{children}</div>
    </>
  );
}
