import Image from "next/image";

interface LogoShieldProps {
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

export function LogoShield({
  size = 36,
  width,
  height,
  className = "",
  priority = false,
  alt = "CareHomesSupportDocs shield logo",
}: LogoShieldProps) {
  const finalWidth = width ?? size;
  const finalHeight = height ?? size;

  return (
    <Image
      src="/logo-shield.png"
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      className={`object-contain shrink-0 ${className}`}
      priority={priority}
    />
  );
}
