import { Anchor } from '@mantine/core';
import { FaExternalLinkAlt } from 'react-icons/fa';

interface ResultScreenshotLinkProps {
  resultId: number;
}

export const ResultScreenshotLink = ({ resultId }: ResultScreenshotLinkProps): JSX.Element => {
  return (
    <Anchor
      href={`${import.meta.env.VITE_API_BASE_PATH}/results/${resultId}/screenshot`}
      target="_blank"
      rel="noopener noreferrer"
      inherit
    >
      screenshot <FaExternalLinkAlt size="0.8em" />
    </Anchor>
  );
};
