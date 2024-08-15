import { fetcher } from "@/lib/ulti";
import RoomTable from "@/ui/RoomTable";

// const getRoom() {
//   const res = await fetch(process.env.NEXTAIU_URL + "/api/room", {
//     method: "GET",
//     next: { revalidate: 30, tags: ["room"] },
//   });
//   if (!res.ok) {
//     return {
//       props: { room: [] },
//     };
//   }
//   return {
//     props: { room: await res.json() },
//   };
// }

export default async function Page() {
  return (
    <div>
      <h1>Room</h1>

      <RoomTable statusOptions={[]} />
    </div>
  );
}
