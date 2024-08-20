import Admindashboard from "@/ui/pages/Admindashboard";
const AdminPage = async () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <Admindashboard/>
      {/* <div className="flex justify-between shadow-xl bg-white rounded-md py-2 px-4 mx-auto max-w-md">
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
        </div> */}
    </div>
  );
};

export default AdminPage;
