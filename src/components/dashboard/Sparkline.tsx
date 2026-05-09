interface Props {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}

export function Sparkline({
  values,
  width = 56,
  height = 20,
  stroke = "#A855F7",
  className,
}: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 2;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = values
    .map((v, i) => {
      const x = padX + (i / (values.length - 1)) * innerW;
      const y = padY + (1 - (v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" points={points} />
    </svg>
  );
}
