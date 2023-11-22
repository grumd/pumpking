import { FaExternalLinkAlt } from 'react-icons/fa';

interface ResultScreenshotLinkProps {
  resultId: number;
}

export const ResultScreenshotLink = ({ resultId }: ResultScreenshotLinkProps): JSX.Element => {
  return (
    <a
      href={`${import.meta.env.VITE_API_BASE_PATH}/results/${resultId}/screenshot`}
      target="_blank"
      rel="noopener noreferrer"
    >
      screenshot <FaExternalLinkAlt style={{ fontSize: '80%' }} />
    </a>
  );
};
