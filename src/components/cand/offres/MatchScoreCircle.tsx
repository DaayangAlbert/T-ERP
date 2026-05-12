interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLS: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-12 w-12 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-16 w-16 text-[18px]",
};

export function MatchScoreCircle({ score, size = "lg" }: Props) {
  const background =
    score >= 90
      ? "linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)"
      : score >= 80
        ? "linear-gradient(135deg, #A855F7 0%, #C084FC 100%)"
        : "linear-gradient(135deg, #C084FC 0%, #A855F7 100%)";
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-xl font-extrabold text-white shadow-brand ${SIZE_CLS[size]}`}
      style={{ background }}
      aria-label={`Score ${score}%`}
    >
      {score}%
    </div>
  );
}
