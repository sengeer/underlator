export interface ButtonWrapperWithBackgroundProps {
  onClick?: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  isDisabled?: boolean;
}
