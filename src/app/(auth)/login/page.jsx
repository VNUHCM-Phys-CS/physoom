import LoginForm from "@/ui/loginForm/loginForm";

const LoginPage = () => {

  return (
    <div className={"flex justify-center items-center"}>
      <div className={"max-w-[500px] p-10 flex text-center gap-5 rounded-xl"}>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;