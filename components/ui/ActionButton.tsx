import { Button, type ButtonProps } from './Button';
import { Icon, type IconName } from './Icon';

export function ActionButton({
  icon,
  label,
  variant = 'primary',
  className = '',
  ...props
}: Omit<ButtonProps, 'children' | 'aria-label' | 'title'> & { icon: IconName; label: string }) {
  return (
    <Button
      {...props}
      variant={variant}
      className={`icon-button action-button ${variant === 'primary' ? 'icon-button--primary' : ''} ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </Button>
  );
}
