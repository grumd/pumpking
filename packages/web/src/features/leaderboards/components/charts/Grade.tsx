import { GradePhoenix, getPhoenixGrade } from 'utils/scoring/grades';

const getFilename = (grade: GradePhoenix, isPass: boolean) => {
  return isPass ? `/grades/phoenix/${grade}.png` : `/grades/phoenix/fail/${grade}.png`;
};

export const Grade = ({
  score,
  grade,
  isPass,
  mix,
}: {
  score: number | null;
  grade: string | null;
  isPass: boolean | null;
  mix: number;
}) => {
  const gradeCalc = getPhoenixGrade(score);

  if (gradeCalc == null) {
    return null;
  }

  let fileName = getFilename(gradeCalc, isPass ?? false);

  // When DB doesn't have information about pass/fail, we can deduce it from the grade if the mix is Prime/Prime2/XX
  if (isPass == null && grade != null && mix >= 24 && mix <= 26) {
    fileName = getFilename(gradeCalc, grade.includes('+'));
  }

  return <img src={fileName} alt={gradeCalc} />;
};
