import { CloseButton } from '@mantine/core';
import { type FieldValues, useWatch } from 'react-hook-form';
import { TextInput, type TextInputProps } from 'react-hook-form-mantine';

interface TextInputWithResetProps<T extends FieldValues> extends TextInputProps<T> {
  onReset: () => void;
}

export const TextInputWithReset = <T extends FieldValues>({
  control,
  onReset,
  ...rest
}: TextInputWithResetProps<T>): JSX.Element => {
  const currentValue = useWatch({
    control,
    name: rest.name,
  });

  return (
    <TextInput
      {...rest}
      control={control}
      rightSection={currentValue ? <CloseButton onClick={onReset} /> : null}
    />
  );
};
