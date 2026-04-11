import { cn } from "@/lib/ui";

interface LogoProps {
  /** Text displayed next to the Dx icon mark. Defaults to "VMR". */
  wordmark?: string;
  /** Pixel size of the square icon. Defaults to 36. */
  size?: number;
  /** Hide the wordmark when only the icon is needed. */
  showWordmark?: boolean;
  className?: string;
}

/**
 * Shared "Dx" icon mark for the CPS ecosystem.
 *
 * Exact copy of the SVG used in SearchCPS (index.html ~line 825) so that
 * both products visually share the same icon. The wordmark is swapped per
 * product — "CPSearch" on the search UI, "VMR" on the publisher — which
 * keeps the family resemblance while preserving each product's identity.
 */
export function Logo({
  wordmark = "VMR",
  size = 36,
  showWordmark = true,
  className,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="16"
          fill="#000"
          stroke="#333"
          strokeWidth="2"
        />
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="62"
          fill="white"
        >
          <tspan fontWeight="400">D</tspan>
          <tspan fontSize="52">x</tspan>
        </text>
      </svg>
      {showWordmark && (
        <span className="whitespace-nowrap text-[22px] font-bold text-text-primary">
          {wordmark}
        </span>
      )}
    </div>
  );
}
