import XLSX from "xlsx";

export const parseTestExcel = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) throw new Error("Excel file is empty");

  const questions = [];
  let totalMarks = 0;
  let passingMarks = 0;

  rows.forEach((row, idx) => {
    const q = {
      index: row.index ?? idx + 1,
      question: row.question,
      options: {
        A: row["option A"],
        B: row["option B"],
        C: row["option C"],
        D: row["option D"],
      },
      correct_answer: String(row.correct_answer).trim().toUpperCase(),
      marks: Number(row.marks_per_question ?? 1),
    };
    totalMarks += q.marks;
    if (idx === 0 && row.passing_marks_for_test)
      passingMarks = Number(row.passing_marks_for_test);
    questions.push(q);
  });

  return { questions, totalMarks, passingMarks };
};
