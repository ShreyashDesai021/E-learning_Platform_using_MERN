import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useUploadTestExcelMutation } from "@/features/api/testApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const UploadTest = () => {
  const { courseId } = useParams();
  const [file, setFile] = useState(null);
  const [uploadTest, { isLoading }] = useUploadTestExcelMutation();

  const handleUpload = async () => {
    if (!file) return toast.error("Please select an Excel file");
    try {
      await uploadTest({ courseId, file }).unwrap();
      toast.success("Test uploaded successfully!");
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Upload failed");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Upload Course Test (Excel)</h1>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={(e) => setFile(e.target.files[0])}
        className="border p-2 w-full mb-4"
      />
      <Button onClick={handleUpload} disabled={isLoading} className="w-full">
        {isLoading ? "Uploading..." : "Upload Test"}
      </Button>
    </div>
  );
};

export default UploadTest;
