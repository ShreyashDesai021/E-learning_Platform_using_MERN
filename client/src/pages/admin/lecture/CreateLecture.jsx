// client/src/pages/admin/lecture/CreateLecture.jsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateLectureMutation,
  useGetCourseLectureQuery,
} from "@/features/api/courseApi";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Lecture from "./Lecture";

const CreateLecture = () => {
  const [lectureTitle, setLectureTitle] = useState("");
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();

  const [createLecture, { data, isLoading, isSuccess, error }] =
    useCreateLectureMutation();

  const {
    data: lectureData,
    isLoading: lectureLoading,
    isError: lectureError,
    refetch,
  } = useGetCourseLectureQuery(courseId, { skip: !courseId });

  const createLectureHandler = async () => {
    if (!lectureTitle.trim()) {
      toast.error("Please enter a lecture title.");
      return;
    }
    try {
      const res = await createLecture({ lectureTitle: lectureTitle.trim(), courseId }).unwrap();
      // try to extract created lecture id from response
      const createdLectureId =
        res?.lecture?._id ?? res?._id ?? res?.data?.lecture?._id ?? null;

      toast.success(res?.message || "Lecture created.");
      if (createdLectureId) {
        navigate(`/admin/course/${courseId}/lecture/${createdLectureId}`);
      } else {
        // fallback: refetch list and clear input
        refetch();
        setLectureTitle("");
      }
    } catch (err) {
      console.error("Create lecture error:", err);
      toast.error(err?.data?.message || "Failed to create lecture.");
    }
  };

  useEffect(() => {
    if (isSuccess && data && !data?.lecture && !data?._id) {
      // if server didn't return id, just refetch
      refetch();
    }
    if (error) {
      toast.error(error?.data?.message || "Failed to create lecture.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, error]);

  return (
    <div className="flex-1 mx-10">
      <div className="mb-4">
        <h1 className="font-bold text-xl">
          Let's add lectures — add some basic details for your new lecture
        </h1>
        <p className="text-sm">Provide a short title and create the lecture.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Your Lecture Title"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/course/${courseId}`)}
          >
            Back to course
          </Button>
          <Button disabled={isLoading} onClick={createLectureHandler}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Create lecture"
            )}
          </Button>
        </div>

        <div className="mt-10">
          {lectureLoading ? (
            <p>Loading lectures...</p>
          ) : lectureError ? (
            <p>Failed to load lectures.</p>
          ) : !lectureData || (Array.isArray(lectureData?.lectures) && lectureData.lectures.length === 0) ? (
            <p>No lectures available</p>
          ) : (
            (lectureData.lectures ?? []).map((lecture, index) => (
              <Lecture
                key={lecture._id}
                lecture={lecture}
                courseId={courseId}
                index={index}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateLecture;
