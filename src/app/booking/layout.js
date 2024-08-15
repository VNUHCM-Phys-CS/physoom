export default function Layout({ children }) {
  return (
    <div className="md:container md:mx-auto flex-col max-h-dvh">
      <div className="p-2 mt-5">{children}</div>
    </div>
  );
}
