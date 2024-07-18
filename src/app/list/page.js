import ListCard from "@/ui/ListCard/ListCard";
import Link from "next/link";
import { auth } from "@/lib/auth";

const getData = async () => {
  const session = await auth();
  const res = await fetch(process.env.NEXTAIU_URL + "/api/list", {
    headers: { userid: session?.user?.id },
    method: "GET",
    next: { revalidate: 30, tags: ["list"] },
  });
  if (!res.ok) {
    return { editable: false, lists: [] };
  }
  return { editable: true, lists: await res.json() };
};

const ListPage = async () => {
  // FETCH DATA WITH AN API
  const { editable, lists } = await getData();

  return (
    <div className="md:container md:mx-auto">
      <div className="flex justify-between shadow-xl bg-white rounded-md py-2 px-4 mx-auto max-w-md">
        <div></div>
        {editable && (
          <Link className="btn btn-primary" href="list/new">
            New show
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2 my-3">
        {lists.map((list) => (
          <div className={""} key={list.id}>
            <ListCard post={list} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListPage;
