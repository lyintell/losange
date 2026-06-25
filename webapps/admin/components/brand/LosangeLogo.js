import Image from 'next/image';

export default function LosangeLogo({ size = 120, className = '' }) {
  return (
    <Image
      src="/logo.png"
      alt="Logo Losange"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
