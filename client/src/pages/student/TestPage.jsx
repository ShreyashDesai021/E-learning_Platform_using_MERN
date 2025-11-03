import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetTestForCourseQuery, useSubmitTestMutation } from "@/features/api/testApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TestPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetTestForCourseQuery(courseId);
  const [submitTest, { isLoading: submitting }] = useSubmitTestMutation();
  const [answers, setAnswers] = useState({});

  if (isLoading) return <p>Loading test...</p>;
  if (!data?.test) return <p>No test available for this course.</p>;

  const handleSelect = (index, choice) => {
    setAnswers({ ...answers, [index]: choice });
  };

  const handleSubmit = async () => {
    try {
      const payload = Object.keys(answers).map((index) => ({
        index: Number(index),
        answer: answers[index],
      }));
      const res = await submitTest({ testId: data.test._id, answers: payload }).unwrap();
      toast.success("Test submitted!");
      navigate(`/certificate/${res.attempt._id}`);
    } catch (err) {
      toast.error(err?.data?.message || "Submission failed");
    }
  };

  const test = data.test;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Course Test</h1>
      <p className="mb-4">
        Total Marks: {test.totalMarks} | Passing Marks: {test.passingMarks}
      </p>

      {test.questions.map((q) => (
        <div key={q.index} className="mb-6 border-b pb-4">
          <p className="font-semibold mb-2">
            {q.index}. {q.question}
          </p>
          {["A", "B", "C", "D"].map((opt) => (
            <label key={opt} className="block">
              <input
                type="radio"
                name={`q-${q.index}`}
                value={opt}
                checked={answers[q.index] === opt}
                onChange={() => handleSelect(q.index, opt)}
              />{" "}
              {opt}. {q.options[opt]}
            </label>
          ))}
        </div>
      ))}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Test"}
      </Button>
    </div>
  );
};

export default TestPage;
