 import ModalServer from "@/ui/ModalServer/ModalServer";
import TeamList from "@/ui/TeamList/TeamList";
import Link from "next/link";
import { auth } from "@/lib/auth";

const getData = async (id) => {
  const session = await auth();
  const res = await fetch(`${process.env.NEXTAIU_URL}/api/list/${id}/presentation`, {
    headers: { userid: session?.user?.id },
    method: "GET",
    next: { revalidate: 30, tags: ["team"] },
  });
  if (!res.ok) {
    return { editable: false, data: [] };
  }
  return { editable: true, data: await res.json() };
};


const Page = async({params: { id: listId }}) => 
{
  const { editable, data } = await getData(listId);
  return (
  <ModalServer
    title={"Edit teams"}>
      {editable?<TeamList value={data} />:<p className="py-4">
        You don't have premission to edit.
      </p>}
  </ModalServer>)
}

export default Page;