import { Image, type ImageProps } from '@mantine/core';

import { GradePhoenix, getPhoenixGrade } from 'utils/scoring/grades';

const getFilename = (grade: GradePhoenix, isPass: boolean) => {
  return isPass ? `/grades/phoenix/${grade}.png` : `/grades/phoenix/fail/${grade}.png`;
};

export const Grade = (
  props: ImageProps & {
    isPass: boolean;
    /** Explicit grade, if not provided it is calculated from the score */
    grade?: GradePhoenix;
    score?: number;
  }
) => {
  const { grade, isPass, score, ...rest } = props;
  const gradeCalc = grade ?? getPhoenixGrade(score);
  return gradeCalc == null ? null : (
    <Image {...rest} fit="contain" src={getFilename(gradeCalc, isPass)} alt={gradeCalc} />
  );
};
