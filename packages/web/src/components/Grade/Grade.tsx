import { Image, type ImageProps } from '@mantine/core';

import { GradePhoenix, getPhoenixGrade } from 'utils/scoring/grades';

const gradeVariants = {
  original: 'phoenix',
  flat: 'phoenix-flat',
} as const;

export type GradeVariant = keyof typeof gradeVariants;

const getFilename = (grade: GradePhoenix, isPass: boolean, variant: GradeVariant) => {
  const folder = `/grades/${gradeVariants[variant]}${isPass ? '' : '/fail'}`;
  const extension = variant === 'original' ? 'png' : 'svg';
  return `${folder}/${grade}.${extension}`;
};

export const Grade = (
  props: ImageProps & {
    isPass: boolean;
    grade?: GradePhoenix;
    score?: number;
    variant?: GradeVariant;
  }
) => {
  const { grade, isPass, score, variant = 'flat', ...rest } = props;
  const gradeCalc = grade ?? getPhoenixGrade(score);
  return gradeCalc == null ? null : (
    <Image {...rest} fit="contain" src={getFilename(gradeCalc, isPass, variant)} alt={gradeCalc} />
  );
};
