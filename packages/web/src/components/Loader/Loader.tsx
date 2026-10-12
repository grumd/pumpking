import { Center, Loader as MantineLoader } from '@mantine/core';

export default function Loader() {
  return (
    <Center w="100%">
      <MantineLoader color="white" type="dots" />
    </Center>
  );
}
