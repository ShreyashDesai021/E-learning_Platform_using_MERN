// client/src/pages/student/CourseDetail.jsx
import BuyCourseButton from "@/components/BuyCourseButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { BadgeInfo, Lock, PlayCircle } from "lucide-react";
import React from "react";
import ReactPlayer from "react-player";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const CourseDetail = () => {
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();

  const { data, isLoading, isError } =
    useGetCourseDetailWithStatusQuery(courseId, {
      skip: !courseId,
    });

  if (!courseId) return <div className="p-4">Invalid course.</div>;
  if (isLoading) return <h1>Loading...</h1>;
  if (isError) return <h1>Failed to load course details</h1>;

  const { course = null, purchased = false } = data ?? {};

  if (!course) {
    return <div className="p-4">Course not found.</div>;
  }

  const lectures = Array.isArray(course.lectures) ? course.lectures : [];
  const lectureCount = lectures.length;
  const firstLecture = lectures[0] ?? null;

  // preview url from first lecture (if exists)
  const videoUrl =
    firstLecture?.videoUrl ?? firstLecture?.video?.videoUrl ?? firstLecture?.video?.url;

  const createdDate = course?.createdAt ? String(course.createdAt).split("T")[0] : "N/A";
  const enrolledCount = Array.isArray(course?.enrolledStudents)
    ? course.enrolledStudents.length
    : 0;

  const handleContinueCourse = () => {
    if (purchased) {
      navigate(`/course-progress/${courseId}`);
    }
  };

  // When user clicks a lecture from CourseDetail:
  // - If purchased => go to course progress and play selected lecture
  // - If not purchased but lecture.isPreviewFree => go to course progress and play
  // - Else prompt to purchase
  const handleLectureClick = (lecture) => {
    if (purchased || lecture?.isPreviewFree) {
      navigate(`/course-progress/${courseId}?lecture=${lecture._id}`);
    } else {
      toast(
        "This lecture is locked. Purchase the course to view all lectures.",
        { type: "error" }
      );
      // optionally scroll to purchase button
      const buyBtn = document.querySelector(".buy-course-scroll-target");
      if (buyBtn) buyBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#2D2F31] text-white">
        <div className="max-w-7xl mx-auto py-8 px-4 md:px-8 flex flex-col gap-2">
          <h1 className="font-bold text-2xl md:text-3xl">
            {course?.courseTitle ?? course?.title ?? "Untitled Course"}
          </h1>
          <p className="text-base md:text-lg">{course?.subtitle ?? ""}</p>
          <p>
            Created By{" "}
            <span className="text-[#C0C4FC] underline italic">
              {course?.creator?.name ?? "Unknown"}
            </span>
          </p>
          <div className="flex items-center gap-2 text-sm">
            <BadgeInfo size={16} />
            <p>Last updated {createdDate}</p>
          </div>
          <p>Students enrolled: {enrolledCount}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto my-5 px-4 md:px-8 flex flex-col lg:flex-row justify-between gap-10">
        {/* LEFT: DESCRIPTION (instructor-provided) */}
        <div className="w-full lg:w-1/2 space-y-5">
          <h1 className="font-bold text-xl md:text-2xl">Description</h1>

          <div className="prose max-w-none text-sm">
            {course?.description ? (
              <div
                dangerouslySetInnerHTML={{ __html: course.description }}
                className="min-h-[200px]"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300">
                No description provided.
              </div>
            )}
          </div>

          {/* Course content (clickable) */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>{lectureCount} lectures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lectureCount === 0 && <div>No lectures added yet.</div>}

              {lectures.map((lecture, idx) => {
                const isFree = !!lecture.isPreviewFree;
                return (
                  <div
                    key={lecture._id ?? idx}
                    role="button"
                    onClick={() => handleLectureClick(lecture)}
                    className="flex items-center gap-3 text-sm p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <span>
                      {purchased || isFree ? (
                        <PlayCircle size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                    </span>
                    <p className="flex-1">
                      {lecture.lectureTitle ?? `Lecture ${idx + 1}`}
                      {isFree && !purchased && (
                        <span className="ml-2 text-xs text-green-600">(Free preview)</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Preview + purchase */}
        <div className="w-full lg:w-1/3">
          <Card>
            <CardContent className="p-4 flex flex-col">
              <div className="w-full aspect-video mb-4 bg-black flex items-center justify-center">
                {videoUrl ? (
                  <ReactPlayer width="100%" height="100%" url={videoUrl} controls={true} />
                ) : firstLecture ? (
                  <div className="text-white text-sm">
                    This lecture does not have a playable video.
                  </div>
                ) : (
                  <div className="text-white text-sm">No lecture preview available.</div>
                )}
              </div>

              <h1 className="font-semibold mb-2">
                {firstLecture?.lectureTitle ?? "Lecture preview"}
              </h1>
              <Separator className="my-2" />
              <h1 className="text-lg md:text-xl font-semibold">
                {typeof course?.coursePrice !== "undefined" ? `₹ ${course.coursePrice}` : "Free"}
              </h1>
            </CardContent>

            <CardFooter className="flex justify-center p-4">
              {/* add class so we can scroll to buy */}
              <div className="w-full buy-course-scroll-target">
                {purchased ? (
                  <Button onClick={handleContinueCourse} className="w-full">
                    Continue Course
                  </Button>
                ) : (
                  <BuyCourseButton courseId={courseId} />
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
