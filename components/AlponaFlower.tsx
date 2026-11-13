/**
 * Original alpana-inspired lotus medallion. The linework is drawn in-house
 * (not copied from a specific artist or historical artifact).
 */
export default function AlponaFlower({
  size = 32,
  petal = "#E1463E",
  center = "#F9BB29",
  className = "",
}: {
  size?: number;
  petal?: string;
  center?: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={`alpona-flower shrink-0 ${className}`}
      fill="none"
    >
      <g stroke="#1C2429" strokeWidth="2.4" strokeLinejoin="round">
        {[0, 45, 90, 135].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 40 40)`}>
            <ellipse cx="40" cy="20" rx="8" ry="15" fill={petal} />
            <ellipse cx="40" cy="60" rx="8" ry="15" fill={petal} />
          </g>
        ))}
        <circle cx="40" cy="40" r="11" fill={center} />
        <circle cx="40" cy="40" r="3" fill="#1C2429" stroke="none" />
      </g>
      <g fill="#298265" stroke="#1C2429" strokeWidth="1.5">
        <path d="M13 55c-7 1-9 7-9 12 7 0 13-3 14-10" />
        <path d="M67 55c7 1 9 7 9 12-7 0-13-3-14-10" />
      </g>
    </svg>
  );
}
