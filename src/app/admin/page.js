import Admindashboard from "@/ui/pages/Admindashboard";
const AdminPage = async () => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-default-900">Dashboard</h2>
        <p className="text-sm text-default-400">Overview of rooms, courses and booking status</p>
      </div>
      <Admindashboard />
    </div>
  );
};

export default AdminPage;
