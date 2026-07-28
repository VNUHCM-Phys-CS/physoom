import { Suspense } from "react";
import BookingClient from "@/ui/BookingClient";

const Page = async () => {
  return (
    <div>
      <div className="prose">
        <h4>Booking</h4>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <BookingClient />
      </Suspense>
    </div>
  );
};
export default Page;
