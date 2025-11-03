// client/src/pages/admin/UploadTest.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUploadTestExcelMutation } from "@/features/api/testApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const UploadTest = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploadTest, { isLoading }] = useUploadTestExcelMutation();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an Excel file first.");
      return;
    }
    try {
      await uploadTest({ courseId, file }).unwrap();
      toast.success("Test uploaded successfully");
      navigate(`/admin/course/${courseId}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Upload failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Test (Excel)</h1>
      <p className="mb-4 text-sm">
        Upload an Excel sheet with headers: index,question,option A,option B,option C,option D,correct_answer,total_marks_for_test,passing_marks_for_test,marks_per_question
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Uploading..." : "Upload Test"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UploadTest;
