import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  useCompleteCourseMutation,
  useGetCourseProgressQuery,
  useInCompleteCourseMutation,
  useUpdateLectureProgressMutation,
} from "@/features/api/courseProgressApi";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { CheckCircle, CheckCircle2, CirclePlay } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CourseProgress = () => {
  const params = useParams();
  const courseId = params.courseId;
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const requestedLectureId = search.get("lecture");
  const navigate = useNavigate();

  const {
    data: purchaseData,
    isLoading: purchaseLoading,
    isError: purchaseError,
  } = useGetCourseDetailWithStatusQuery(courseId, { skip: !courseId });

  const {
    data,
    isLoading: progressLoading,
    isError,
    refetch: refetchProgress,
  } = useGetCourseProgressQuery(courseId, { skip: !courseId });

  const [updateLectureProgress] = useUpdateLectureProgressMutation();
  const [completeCourse, { data: markCompleteData, isSuccess: completedSuccess }] =
    useCompleteCourseMutation();
  const [inCompleteCourse, { data: markInCompleteData, isSuccess: inCompletedSuccess }] =
    useInCompleteCourseMutation();

  const [currentLecture, setCurrentLecture] = useState(null);

  useEffect(() => {
    if (completedSuccess) {
      refetchProgress();
      toast.success(markCompleteData?.message || "Marked course as completed");
    }
    if (inCompletedSuccess) {
      refetchProgress();
      toast.success(markInCompleteData?.message || "Marked course as incomplete");
    }
  }, [completedSuccess, inCompletedSuccess, markCompleteData, markInCompleteData, refetchProgress]);

  useEffect(() => {
    if ((purchaseLoading || progressLoading) || isError || purchaseError) return;

    const courseDetails = data?.data?.courseDetails;
    const purchased = purchaseData?.purchased ?? false;

    if (requestedLectureId && courseDetails?.lectures) {
      const requested = courseDetails.lectures.find(
        (l) => String(l._id) === String(requestedLectureId)
      );
      if (requested) {
        if (purchased || requested.isPreviewFree) {
          setCurrentLecture(requested);
          handleLectureProgress(requested._id, { skipRefetch: true }).catch(() => {});
          return;
        } else {
          toast.error("This lecture is locked. Purchase the course to view all lectures.");
        }
      }
    }

    if (!currentLecture && courseDetails?.lectures && courseDetails.lectures.length > 0) {
      setCurrentLecture(courseDetails.lectures[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseLoading, progressLoading, data, purchaseData, requestedLectureId]);

  if (!courseId) return <p>Invalid course selected.</p>;
  if (purchaseLoading || progressLoading) return <p>Loading...</p>;
  if (isError || purchaseError) return <p>Failed to load course details</p>;
  if (!data || !data.data) return <p>No course data available</p>;

  const courseDetails = data.data.courseDetails || { lectures: [] };
  const progress = data.data.progress || [];
  const completed = data.data.completed || false;
  const purchased = purchaseData?.purchased ?? false;

  const isLectureCompleted = (lectureId) =>
    progress.some((prog) => String(prog.lectureId) === String(lectureId) && prog.viewed);

  const handleLectureProgress = async (lectureId, { skipRefetch = false } = {}) => {
    try {
      const lecture = courseDetails.lectures.find((l) => String(l._id) === String(lectureId));
      if (!lecture) return;

      if (!purchased && !lecture.isPreviewFree) {
        toast.error("You must purchase the course to view this lecture.");
        return;
      }

      await updateLectureProgress({ courseId, lectureId });
      if (!skipRefetch) refetchProgress();
    } catch (err) {
      console.error("Failed to update lecture progress", err);
      toast.error(err?.data?.message || "Failed to update progress");
    }
  };

  const handleSelectLecture = (lecture) => {
    if (!purchased && !lecture.isPreviewFree) {
      toast.error("This lecture is locked. Purchase the course to view all lectures.");
      return;
    }

    setCurrentLecture(lecture);
    handleLectureProgress(lecture._id);
  };

  const handleCompleteCourse = async () => {
    try {
      await completeCourse(courseId).unwrap();
    } catch (err) {
      console.error("Complete course failed:", err);
      toast.error(err?.data?.message || "Failed to mark completed");
    }
  };

  const handleInCompleteCourse = async () => {
    try {
      await inCompleteCourse(courseId).unwrap();
    } catch (err) {
      console.error("InComplete course failed:", err);
      toast.error(err?.data?.message || "Failed to mark incomplete");
    }
  };

  const initialLecture =
    currentLecture ||
    (courseDetails.lectures && courseDetails.lectures[0]) ||
    null;

  const canViewInitial = initialLecture && (purchased || initialLecture.isPreviewFree);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">{courseDetails.courseTitle}</h1>
        <Button
          onClick={completed ? handleInCompleteCourse : handleCompleteCourse}
          variant={completed ? "outline" : "default"}
        >
          {completed ? (
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" /> <span>Completed</span>
            </div>
          ) : (
            "Mark as completed"
          )}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 md:w-3/5 h-fit rounded-lg shadow-lg p-4">
          <div>
            {canViewInitial ? (
              <video
                src={currentLecture?.videoUrl || initialLecture?.videoUrl}
                controls
                className="w-full h-auto md:rounded-lg"
                onPlay={() =>
                  handleLectureProgress(currentLecture?._id || initialLecture?._id)
                }
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gray-100 text-sm">
                This lecture is locked. Purchase the course to view.
              </div>
            )}
          </div>
          <div className="mt-2 ">
            <h3 className="font-medium text-lg">
              {`Lecture ${
                (courseDetails.lectures || []).findIndex(
                  (lec) =>
                    String(lec._id) === String(currentLecture?._id || initialLecture?._id)
                ) + 1
              } : ${
                (currentLecture?.lectureTitle || initialLecture?.lectureTitle) || "Lecture"
              }`}
            </h3>
          </div>

          {/* 🆕 Take Final Test Button */}
          {completed && (
            <div className="mt-6 text-center">
              <Button onClick={() => navigate(`/course/${courseId}/test`)}>
                Take Final Test
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full md:w-2/5 border-t md:border-t-0 md:border-l border-gray-200 md:pl-4 pt-4 md:pt-0">
          <h2 className="font-semibold text-xl mb-4">Course Lecture</h2>
          <div className="flex-1 overflow-y-auto">
            {courseDetails?.lectures?.map((lecture) => (
              <Card
                key={lecture._id}
                className={`mb-3 hover:cursor-pointer transition transform ${
                  String(lecture._id) === String(currentLecture?._id)
                    ? "bg-gray-200 dark:dark:bg-gray-800"
                    : ""
                } `}
                onClick={() => handleSelectLecture(lecture)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    {isLectureCompleted(lecture._id) ? (
                      <CheckCircle2 size={24} className="text-green-500 mr-2" />
                    ) : (
                      <CirclePlay size={24} className="text-gray-500 mr-2" />
                    )}
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {lecture.lectureTitle}
                        {!purchased && lecture.isPreviewFree && (
                          <span className="ml-2 text-xs text-green-600">(Free preview)</span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  {isLectureCompleted(lecture._id) && (
                    <Badge variant={"outline"} className="bg-green-200 text-green-600">
                      Completed
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseProgress;
