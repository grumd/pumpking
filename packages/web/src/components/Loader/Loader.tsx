import { Center, Loader as MantineLoader } from '@mantine/core';

export default function Loader({ className }: { className?: string }) {
  return (
    <Center w="100%" className={className}>
      <MantineLoader color="white" type="dots" />
    </Center>
  );
}
