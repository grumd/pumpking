const Grade = ({ grade }: { grade: string | null }) => {
  if (!grade || grade === '?') {
    return null;
  }
  return <img src={`/grades/${grade}.png`} alt={grade} />;
};

export default Grade;
