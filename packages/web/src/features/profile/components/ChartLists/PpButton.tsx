import type { PpSteps } from '@/api/services/results/resultsPp';
import { Button, Popover, Text } from '@mantine/core';

import { KeyValueList } from 'components/KeyValueList/KeyValueList';

import { useLanguage } from 'utils/context/translation';
import { getLongTimeAgo } from 'utils/timeAgo';

const short = (value: number) => String(Number(value.toFixed(2)));
const percent = (factor: number) => `${short(factor * 100)}%`;
const ppText = (pp: number) => `${pp.toFixed(2)} pp`;

const Shown = ({ children }: { children: React.ReactNode }) => (
  <Text span inherit fw={700}>
    {children}
  </Text>
);

interface PpButtonProps {
  shown: 'full' | 'contribution';
  pp: number;
  steps: PpSteps | null;
  score: number | null;
  date: Date;
  ageFactor: number;
  place?: number;
  weight?: number;
}

export const PpButton = ({
  shown,
  pp,
  steps,
  score,
  date,
  ageFactor,
  place,
  weight,
}: PpButtonProps): JSX.Element => {
  const lang = useLanguage();
  const afterAge = pp * ageFactor;
  const value = shown === 'full' ? pp : afterAge * (weight ?? 1);

  return (
    <Popover withArrow width="min-content" position="bottom-end">
      <Popover.Target>
        <Button variant="default" size="compact-md">
          {ppText(value)}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <KeyValueList
          noWrap
          items={[
            steps && { label: lang.PP_STEP_DIFFICULTY, value: short(steps.chartLevel) },
            steps && { label: lang.PP_STEP_MAX_PP, value: ppText(steps.maxPp) },
            score !== null && { label: lang.PP_STEP_SCORE, value: score.toLocaleString('en-US') },
            steps &&
              score !== null && {
                label: lang.PP_STEP_SCORE_FACTOR,
                value:
                  steps.scoreFactor === 0
                    ? '0%'
                    : `((${score / 1_000_000} − 0.5) / 0.5)² = ${percent(steps.scoreFactor)}`,
              },
            {
              label: lang.PP_STEP_SCORE_PP,
              value: (
                <>
                  {steps && `${steps.maxPp.toFixed(2)} × ${percent(steps.scoreFactor)} = `}
                  {shown === 'full' ? <Shown>{ppText(pp)}</Shown> : ppText(pp)}
                </>
              ),
            },
            {
              label: lang.PP_STEP_AGE(getLongTimeAgo(lang, date)),
              value: `× ${percent(ageFactor)} = ${ppText(afterAge)}`,
            },
            shown === 'contribution' &&
              place !== undefined &&
              weight !== undefined && {
                label: lang.PP_STEP_PLACE(place),
                value: (
                  <>
                    × {percent(weight)} = <Shown>{ppText(value)}</Shown>
                  </>
                ),
              },
          ]}
        />
      </Popover.Dropdown>
    </Popover>
  );
};
