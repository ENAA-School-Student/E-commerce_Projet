interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  weight?: number;
  size?: number;
}

export default function Icon({ name, className = 'text-2xl', filled = false, weight, size }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight ?? 300}, 'GRAD' 0, 'opsz' ${size ?? 24}`,
      }}
    >
      {name}
    </span>
  );
}
