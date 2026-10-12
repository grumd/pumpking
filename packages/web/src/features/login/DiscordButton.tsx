import { Button, rem } from '@mantine/core';
import { FaDiscord } from 'react-icons/fa';

// The Discord sign-in / sign-up link
export const DiscordButton = ({ href, label }: { href: string; label: string }): JSX.Element => {
  return (
    <Button component="a" href={href} leftSection={<FaDiscord size={rem(20)} />} color="discord">
      {label}
    </Button>
  );
};
