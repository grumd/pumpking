import { CloseButton, TextInput, type TextInputProps } from '@mantine/core';

import { useLanguage } from 'utils/context/translation';

interface TextInputWithResetProps extends TextInputProps {
  onReset: () => void;
}

export const TextInputWithReset = ({
  onReset,
  value,
  ...rest
}: TextInputWithResetProps): JSX.Element => {
  const lang = useLanguage();
  return (
    <TextInput
      {...rest}
      value={value}
      rightSection={value ? <CloseButton aria-label={lang.CLEAR} onClick={onReset} /> : null}
    />
  );
};
