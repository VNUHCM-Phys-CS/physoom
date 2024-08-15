"use client";
import { Breadcrumbs, BreadcrumbItem } from "@nextui-org/react";
import { usePathname, useSearchParams } from "next/navigation";
export default function BreadcrumbsHeader({}) {
  const router = usePathname();
  const paths = router.split("/");
  const breadcrumbs = paths
    .filter((path) => path)
    .map((path, index) => {
      const route = `/${paths.slice(0, index + 1).join("/")}`;
      return {
        label: path.replace(/^\//, ""), // Remove leading slash
        href: route,
      };
    });
  return (
    <Breadcrumbs radius={10} variant="solid">
      {breadcrumbs.map((crumb, index) => (
        <BreadcrumbItem key={index} className={"capitalize"}>
          {crumb.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
