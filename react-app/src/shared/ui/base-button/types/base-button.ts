export interface BaseButtonProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  text?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isActiveStyle?: boolean;
  isDisabled?: boolean;
  tooltipText?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
