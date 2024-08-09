export default function Layout({ children,course, room, booking }) {
  return (
    <>
      <div>{course}</div>
      <div>{room}</div>
      <div>{booking}</div>
      <div>{children}</div>
    </>
  );
}
