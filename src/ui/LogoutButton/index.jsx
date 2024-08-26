import { handleLogout } from "@/lib/action";

const LogoutButton = ({...props}) => {

  return (
    <button {...props} onClick={handleLogout}>
      Logout
    </button>
  );
};

export default LogoutButton;