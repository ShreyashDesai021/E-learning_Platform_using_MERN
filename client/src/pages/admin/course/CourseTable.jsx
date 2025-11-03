// client/src/pages/admin/course/CourseTable.jsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetCreatorCourseQuery } from "@/features/api/courseApi";
import { Edit, Upload } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

const CourseTable = () => {
  const { data, isLoading, isError, error } = useGetCreatorCourseQuery();
  const navigate = useNavigate();

  if (isLoading) return <h1>Loading...</h1>;
  if (isError) {
    console.error("Failed to fetch creator courses:", error);
    return <div className="p-4">Failed to load courses. Try again later.</div>;
  }

  const courses = data?.courses ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Courses</h2>
        <Button onClick={() => navigate("create")}>Create a new course</Button>
      </div>

      {courses.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          You don't have any courses yet. Click &quot;Create a new course&quot; to add one.
        </div>
      ) : (
        <Table>
          <TableCaption>A list of your recent courses.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course._id}>
                <TableCell className="font-medium">
                  {typeof course?.coursePrice !== "undefined"
                    ? `₹ ${course.coursePrice}`
                    : "NA"}
                </TableCell>
                <TableCell>
                  <Badge>{course?.isPublished ? "Published" : "Draft"}</Badge>
                </TableCell>
                <TableCell>{course?.courseTitle ?? "Untitled"}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  {/* ✅ Upload Test Button (goes to upload page) */}
                  <Button
                    size="sm"
                    variant="outline"
                    title="Upload Test"
                    onClick={() => navigate(`/admin/course/${course._id}/upload-test`)}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Test
                  </Button>

                  {/* Existing Edit Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`${course._id}`)}
                  >
                    <Edit />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default CourseTable;
