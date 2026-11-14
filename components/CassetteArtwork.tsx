/**
 * Original vector drawing of a compact cassette: shell, label, tape window,
 * twin spools, tape path, pressure pad and shell openings. Reused for the home
 * era-picker and quiz picker so cassette visuals stay consistent.
 */
export default function CassetteArtwork({
  label,
  accent = "#298265",
  shell = "#D4C19B",
}: {
  label: string;
  accent?: string;
  shell?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 224"
      className="cassette-art block h-auto w-full"
      fill="none"
    >
      {/* plastic shell and bevel */}
      <rect x="8" y="8" width="344" height="208" rx="25" fill="#1C2429" />
      <rect x="14" y="12" width="332" height="198" rx="22" fill={shell} stroke="#1C2429" strokeWidth="4" />
      <path d="M25 34Q25 20 40 20H320Q335 20 335 34" stroke="#FAF1DD" strokeWidth="3" opacity=".8" />

      {/* screw heads */}
      {[["32", "32"], ["328", "32"], ["32", "190"], ["328", "190"]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="5" fill="#9D8C7F" stroke="#1C2429" strokeWidth="1.5" />
          <path d={`M${Number(cx) - 2} ${cy}h4`} stroke="#1C2429" strokeWidth="1" />
        </g>
      ))}

      {/* paper label with era-color stripe */}
      <rect x="49" y="25" width="262" height="57" rx="5" fill="#FAF1DD" stroke="#1C2429" strokeWidth="2.5" />
      <path d="M52 34h256" stroke={accent} strokeWidth="8" />
      <path d="M52 42h256" stroke="#F9BB29" strokeWidth="2" />
      <text
        x="180"
        y="68"
        textAnchor="middle"
        fill="#1C2429"
        fontFamily="var(--font-hind), sans-serif"
        fontSize="22"
        fontWeight="700"
      >
        {label}
      </text>

      {/* smoked window */}
      <rect x="42" y="91" width="276" height="87" rx="15" fill="#163B37" stroke="#1C2429" strokeWidth="3" />
      <path d="M60 102h240" stroke="#F7EAD0" strokeWidth="1.5" opacity=".32" />

      {/* tape spools */}
      <g className="cassette-reel cassette-reel-left">
        <circle cx="112" cy="134" r="28" fill="#D8D2C2" stroke="#1C2429" strokeWidth="3" />
        <circle cx="112" cy="134" r="20" fill="#5A5E59" stroke="#1C2429" strokeWidth="2" />
        <circle cx="112" cy="134" r="7" fill="#F9BB29" stroke="#1C2429" strokeWidth="2" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="112"
            cy="120"
            rx="3"
            ry="6"
            fill="#1C2429"
            transform={`rotate(${angle} 112 134)`}
          />
        ))}
      </g>
      <g className="cassette-reel cassette-reel-right">
        <circle cx="248" cy="134" r="28" fill="#D8D2C2" stroke="#1C2429" strokeWidth="3" />
        <circle cx="248" cy="134" r="20" fill="#5A5E59" stroke="#1C2429" strokeWidth="2" />
        <circle cx="248" cy="134" r="7" fill="#F9BB29" stroke="#1C2429" strokeWidth="2" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="248"
            cy="120"
            rx="3"
            ry="6"
            fill="#1C2429"
            transform={`rotate(${angle} 248 134)`}
          />
        ))}
      </g>

      {/* magnetic tape, guides and pressure pad */}
      <path d="M112 161c16 8 21 11 34 11h68c13 0 18-3 34-11" stroke="#E8D3AC" strokeWidth="4" />
      <circle cx="146" cy="164" r="3" fill="#F9BB29" />
      <circle cx="214" cy="164" r="3" fill="#F9BB29" />
      <rect x="163" y="177" width="34" height="5" rx="2.5" fill="#1C2429" />

      {/* shell openings along the lower edge */}
      <path d="M54 191h26l8 12H55l-1-12Zm46 0h26l6 12h-25l-7-12Zm43 0h74l-7 12h-60l-7-12Zm89 0h26l-7 12h-25l6-12Zm48 0h26l-1 12h-33l8-12Z" fill="#1C2429" />
      <path d="M28 187h16v17H28zm288 0h16v17h-16z" fill="#543C22" stroke="#1C2429" strokeWidth="2" />
    </svg>
  );
}
