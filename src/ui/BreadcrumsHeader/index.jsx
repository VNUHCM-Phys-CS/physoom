"use client";
import { Breadcrumbs, BreadcrumbItem } from "@nextui-org/react";
import { usePathname, useSearchParams } from "next/navigation";
export default function BreadcrumbsHeader({}) {
  const router = usePathname();
  const paths = router.split("/").filter((path) => path);
  const breadcrumbs = paths
    .map((path, index) => {
      let route = `/${paths.slice(0, index + 1).join("/")}`;
      if (route[0]&&route[1]&&(route[0]==='/')&&(route[1]==='/'))
        route = route.slice(1,route.length);
      return {
        label: path.replace(/^\//, ""), // Remove leading slash
        href: route,
      };
    });
  return (
    <Breadcrumbs radius={10} variant="solid">
      {breadcrumbs.map((crumb, index) => (
        <BreadcrumbItem key={index} className={"capitalize"} href={crumb.href}>
          {crumb.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
