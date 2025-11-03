// client/src/pages/admin/lecture/LectureTab.jsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  useEditLectureMutation,
  useGetLectureByIdQuery,
  useRemoveLectureMutation,
} from "@/features/api/courseApi";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

const LectureTab = () => {
  const [lectureTitle, setLectureTitle] = useState("");
  const [uploadVideoInfo, setUploadVideoInfo] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const params = useParams();
  const { courseId, lectureId } = params;

  const { data: lectureData, isLoading: lectureLoading } = useGetLectureByIdQuery(lectureId, { skip: !lectureId });
  const lecture = lectureData?.lecture ?? lectureData ?? null;

  useEffect(() => {
    if (lecture) {
      setLectureTitle(lecture.lectureTitle ?? "");
      setIsFree(!!lecture.isPreviewFree);
      const existingVideo =
        lecture.videoInfo ??
        (lecture.videoUrl ? { videoUrl: lecture.videoUrl, publicId: lecture.publicId ?? null } : null);
      setUploadVideoInfo(existingVideo);
    }
  }, [lecture]);

  const [editLecture, { data, isLoading, error, isSuccess }] = useEditLectureMutation();
  const [removeLecture, { data: removeData, isLoading: removeLoading, isSuccess: removeSuccess }] = useRemoveLectureMutation();

  const fileChangeHandler = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // DEBUG: log FormData contents so we can confirm file is attached
    for (const pair of formData.entries()) {
      const [key, value] = pair;
      console.log("FormData entry:", key, value instanceof File ? `${value.name} (File, ${value.size} bytes)` : value);
    }

    setMediaProgress(true);
    setUploadProgress(0);

    try {
      const res = await api.post("/media/upload-video", formData, {
        // IMPORTANT: do not set Content-Type manually here
        onUploadProgress: ({ loaded, total }) => {
          if (!total) return;
          setUploadProgress(Math.round((loaded * 100) / total));
        },
      });

      console.log("Upload response:", res?.data);

      if (res?.data?.success) {
        const returned = res.data.data;
        const videoInfo = {
          videoUrl: returned.videoUrl ?? returned.url ?? returned.secure_url ?? null,
          publicId: returned.publicId ?? returned.public_id ?? null,
          raw: returned,
        };

        setUploadVideoInfo(videoInfo);
        toast.success(res.data.message ?? "Upload successful");

        // === AUTO-SAVE: immediately persist the uploaded video to lecture ===
        try {
          const payload = {
            lectureTitle: lectureTitle || lecture?.lectureTitle || "Lecture",
            videoInfo: videoInfo,
            isPreviewFree: isFree,
            courseId,
            lectureId,
          };

          const saveRes = await editLecture(payload).unwrap();
          console.log("Auto-save response:", saveRes);
          toast.success(saveRes?.message || "Lecture saved with uploaded video");
        } catch (saveErr) {
          console.error("Auto-save failed:", saveErr);
          toast.error(saveErr?.data?.message || "Failed to save lecture automatically — please click Update");
        }
        // === end auto-save ===

      } else {
        console.error("Upload returned success:false", res?.data);
        toast.error("Upload failed: invalid server response");
      }
    } catch (err) {
      console.error("video upload failed", err);
      toast.error(err?.response?.data?.message || "Video upload failed");
    } finally {
      setMediaProgress(false);
      setUploadProgress(0);
    }
  };

  const editLectureHandler = async () => {
    try {
      const payload = {
        lectureTitle,
        videoInfo: uploadVideoInfo,
        isPreviewFree: isFree,
        courseId,
        lectureId,
      };
      const res = await editLecture(payload).unwrap();
      toast.success(res?.message || "Lecture updated");
    } catch (err) {
      console.error("Edit lecture error:", err);
      toast.error(err?.data?.message || "Failed to update lecture");
    }
  };

  const removeLectureHandler = async () => {
    if (!confirm("Are you sure you want to remove this lecture?")) return;
    try {
      const res = await removeLecture(lectureId).unwrap();
      toast.success(res?.message || "Lecture removed");
    } catch (err) {
      console.error("Remove lecture error:", err);
      toast.error(err?.data?.message || "Failed to remove lecture");
    }
  };

  if (lectureLoading) return <h1>Loading...</h1>;

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div>
          <CardTitle>Edit Lecture</CardTitle>
          <CardDescription>Make changes and click save when done.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={removeLoading} variant="destructive" onClick={removeLectureHandler}>
            {removeLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Remove Lecture"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <Label>Title</Label>
          <Input
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            type="text"
            placeholder="Ex. Introduction to Javascript"
          />
        </div>

        <div className="my-5">
          <Label>
            Video <span className="text-red-500">*</span>
          </Label>
          <Input
            type="file"
            accept="video/*"
            onChange={fileChangeHandler}
            placeholder="Upload video"
            className="w-fit"
          />
        </div>

        <div className="flex items-center space-x-2 my-5">
          <Switch checked={isFree} onCheckedChange={setIsFree} id="is-preview-free" />
          <Label htmlFor="is-preview-free">Is this video FREE</Label>
        </div>

        {mediaProgress && (
          <div className="my-4">
            <Progress value={uploadProgress} />
            <p>{uploadProgress}% uploaded</p>
          </div>
        )}

        {uploadVideoInfo && (
          <div className="my-4 text-sm">
            Uploaded: {uploadVideoInfo.videoUrl ?? "Uploaded (no preview URL returned)"}
          </div>
        )}

        <div className="mt-4">
          <Button disabled={isLoading} onClick={editLectureHandler}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Update Lecture"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LectureTab;
