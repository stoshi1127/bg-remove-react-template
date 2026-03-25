import Image from 'next/image';

type BrandIconProps = {
  size?: number;
  className?: string;
  roundedClassName?: string;
};

export default function BrandIcon({
  size = 40,
  className = '',
}: BrandIconProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image src="/icon.svg" alt="" fill sizes={`${size}px`} priority={false} />
    </div>
  );
}
