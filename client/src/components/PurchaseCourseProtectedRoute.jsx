// client/src/components/PurchaseCourseProtectedRoute.jsx
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { useParams, Navigate, useLocation } from "react-router-dom";

const PurchaseCourseProtectedRoute = ({ children }) => {
  const { courseId } = useParams();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const lectureId = search.get("lecture");

  const { data, isLoading } = useGetCourseDetailWithStatusQuery(courseId);

  if (isLoading) return <p>Loading...</p>;

  // if purchased, allow
  if (data?.purchased) return children;

  // if lecture query param provided and that lecture is free, allow preview without purchase
  const course = data?.course;
  if (lectureId && course?.lectures) {
    const found = course.lectures.find((l) => String(l._id) === String(lectureId));
    if (found && found.isPreviewFree) {
      return children;
    }
  }

  // else redirect back to course detail for purchase
  return <Navigate to={`/course-detail/${courseId}`} />;
};

export default PurchaseCourseProtectedRoute;
