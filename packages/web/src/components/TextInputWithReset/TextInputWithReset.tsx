import { CloseButton, TextInput, type TextInputProps } from '@mantine/core';

interface TextInputWithResetProps extends TextInputProps {
  onReset: () => void;
}

export const TextInputWithReset = ({
  onReset,
  value,
  ...rest
}: TextInputWithResetProps): JSX.Element => {
  return (
    <TextInput
      {...rest}
      value={value}
      rightSection={value ? <CloseButton onClick={onReset} /> : null}
    />
  );
};
