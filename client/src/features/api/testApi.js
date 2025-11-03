import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
const TEST_API = `${BASE}/test`;

export const testApi = createApi({
  reducerPath: "testApi",
  baseQuery: fetchBaseQuery({
    baseUrl: TEST_API,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Refetch_Test"],
  endpoints: (builder) => ({
    // Instructor uploads Excel
    uploadTestExcel: builder.mutation({
      query: ({ courseId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/${courseId}/upload`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Refetch_Test"],
    }),

    // Get test for course
    getTestForCourse: builder.query({
      query: (courseId) => ({
        url: `/${courseId}`,
        method: "GET",
      }),
      providesTags: ["Refetch_Test"],
    }),

    // Student submits answers
    submitTest: builder.mutation({
      query: ({ testId, answers }) => ({
        url: `/${testId}/submit`,
        method: "POST",
        body: { answers },
      }),
      invalidatesTags: ["Refetch_Test"],
    }),

    // Fetch attempt (for certificate/result)
    getAttempt: builder.query({
      query: (attemptId) => ({
        url: `/attempt/${attemptId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useUploadTestExcelMutation,
  useGetTestForCourseQuery,
  useSubmitTestMutation,
  useGetAttemptQuery,
} = testApi;
