interface ComptableMiniTrendProps {
  values: number[];
  stroke?: string;
  fill?: string;
}

function buildPath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function ComptableMiniTrend({
  values,
  stroke = "#14b8a6",
  fill = "rgba(20,184,166,0.16)",
}: ComptableMiniTrendProps) {
  const width = 160;
  const height = 56;
  const linePath = buildPath(values, width, height);
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
