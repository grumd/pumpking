import { Image, type ImageProps } from '@mantine/core';

import { GradePhoenix, getPhoenixGrade } from 'utils/scoring/grades';

const getFilename = (grade: GradePhoenix, isPass: boolean) => {
  return isPass ? `/grades/phoenix/${grade}.png` : `/grades/phoenix/fail/${grade}.png`;
};

export const Grade = (
  props: ImageProps &
    (
      | {
          score: number;
          isPass: boolean;
          scoring: 'phoenix';
          grade?: undefined;
        }
      | {
          grade: string | null;
          scoring: 'xx';
          isPass?: undefined;
          score?: undefined;
        }
      | {
          grade: GradePhoenix;
          isPass: boolean;
          scoring: 'phoenix';
          score?: undefined;
        }
    )
) => {
  if (props.scoring === 'phoenix') {
    const { grade, isPass, score, ...rest } = props;
    const gradeCalc = grade ?? getPhoenixGrade(score);
    return gradeCalc == null ? null : (
      <Image
        {...rest}
        fit="contain"
        src={getFilename(gradeCalc, isPass ?? false)}
        alt={gradeCalc}
      />
    );
  } else {
    const { grade, ...rest } = props;
    return !grade || grade === '?' ? null : (
      <Image {...rest} fit="contain" src={`/grades/${grade}.png`} alt={grade ?? '?'} />
    );
  }
};
