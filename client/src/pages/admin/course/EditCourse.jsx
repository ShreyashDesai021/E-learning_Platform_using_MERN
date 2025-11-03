// client/src/pages/admin/course/EditCourse.jsx
import { Button } from "@/components/ui/button";
import React from "react";
import { Link, useParams } from "react-router-dom";
import CourseTab from "./CourseTab";

const EditCourse = () => {
  const { courseId } = useParams();

  return (
    <div className="flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="font-bold text-xl">
          Add detailed information regarding this course
        </h1>

        <div className="flex items-center gap-2">
          {/* ✅ Upload Test button */}
          {courseId && (
            <Link to={`/admin/course/${courseId}/upload-test`}>
              <Button variant="outline" size="sm">
                Upload Test
              </Button>
            </Link>
          )}

          {/* Existing lectures link */}
          <Link to="lecture">
            <Button className="hover:text-blue-600" variant="link" size="sm">
              Go to Lectures Page
            </Button>
          </Link>
        </div>
      </div>

      <CourseTab />
    </div>
  );
};

export default EditCourse;
