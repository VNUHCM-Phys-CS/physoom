import RoomTable from "@/ui/RoomTable";


export default async function Page() {
  return (
    <div>
      <h1>Room</h1>

      <RoomTable statusOptions={[]} />
    </div>
  );
}
