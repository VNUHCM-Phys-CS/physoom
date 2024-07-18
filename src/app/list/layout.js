export default function Layout({ children,presentor }) {
  return (
    <>
      <div>{children}</div>
      <div>{presentor}</div>
    </>
  );
}
