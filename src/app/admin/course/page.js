import CourseTable from "@/ui/CourseTable";

export default async function Page() {
  return (
    <div>
      <h1>Course</h1>
      <CourseTable statusOptions={[]} />
    </div>
  );
}
