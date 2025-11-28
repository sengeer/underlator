/**
 * @module Gradient
 * Компактный декоративный градиент для создания мягких акцентов на фоне.
 *
 * Используется в ключевых пользовательских сценариях (`chat`, `pdf-viewer`) для
 * визуального отделения интерактивных областей без перегрузки интерфейса.
 */

import './styles/gradient.scss';
import type { GradientProps } from './types/gradient';

/**
 * Нейтральный слой с мягким градиентом, предназначенный для визуального
 * обрамления интерактивных областей и придания глубины без отвлечения
 * пользователя от основного контента.
 *
 * @param props - Пропсы компонента Gradient.
 *
 * @example
 * // Верхний акцент в PDF Viewer
 * <Gradient style={{ position: 'absolute', top: 0, left: 0 }} />
 *
 * @example
 * // Нижний акцент в Chat c поворотом
 * <Gradient
 *   style={{
 *     position: 'absolute',
 *     bottom: 0,
 *     right: 0,
 *     transform: 'rotate(180deg)',
 *   }}
 * />
 */
function Gradient({ style }: GradientProps) {
  return <div className='gradient' style={style} />;
}

export default Gradient;
