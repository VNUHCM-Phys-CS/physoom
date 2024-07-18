import ListForm from "@/ui/listForm/listForm";
import { auth } from "@/lib/auth";

const getData = async () => {
  const session = await auth();
  return session;
};
const ListNewPage = async () => {
  const session = await getData();
  return (
    <div className="flex-c-c">
      {session?.user?.isAdmin ? (
        <div>
          <ListForm userid={session?.user?.id} />
        </div>
      ) : (
        <div>
          <h3>You don't have permission to create!</h3>
        </div>
      )}
    </div>
  );
};

export default ListNewPage;
