import Icon from '@mdi/react';
import { getAdminIconPath } from '@/lib/navigation/icons';

export default function AdminIcon({ name, size = 20, className = '', title }) {
  const path = getAdminIconPath(name);
  if (!path) return null;

  // @mdi/react treats numeric size as rem multiplier (18 → 27rem), so use px strings.
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <Icon
      path={path}
      size={dimension}
      className={className}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
