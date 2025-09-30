/**
 * @module ProgressBar
 * Компонент прогресс-бара.
 */

import './styles/progress-bar.scss';
import type { ProgressBarProps } from './types/progress-bar';

/**
 * Прогресс-бар.
 * @param {number} percentage - Процент заполнения.
 * @param {React.CSSProperties} style - Стили компонента.
 * @returns {JSX.Element}
 */
function ProgressBar({ percentage, style }: ProgressBarProps) {
  return (
    <div className='progress-bar' style={style}>
      <div className='progress-bar__fill' style={{ width: `${percentage}%` }} />
    </div>
  );
}

export default ProgressBar;
