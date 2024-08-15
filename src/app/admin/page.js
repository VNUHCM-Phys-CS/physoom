import Card from "@/ui/Card";
const AdminPage = async () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="flex gap-4 items-stretch">
        <div className="basis-1/3 text-center">
          <Card className="h-full">
            <h4>#Room</h4>
            <h4>0</h4>
          </Card>
        </div>
        <div className="basis-1/3 text-center">
          <Card className="h-full">#Course</Card>
        </div>
        <div className="basis-1/3 text-center">
          <Card className="h-full">#Booking</Card>
        </div>
      </div>
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
