/**
 * @module Themes
 * Компонент для выбора и управления темами приложения.
 *
 * Отображает список доступных тем в виде кнопок с визуальным представлением
 * цветовой схемы. Поддерживает переключение между темами и автоматически
 * применяет выбранную тему к приложению.
 *
 * @example
 * // Использование в Settings компоненте
 * <Themes />
 */

import { useDispatch, useSelector } from 'react-redux';
import {
  selectThemes,
  selectActiveTheme,
  setActiveTheme,
} from '../../../shared/models/themes-slice';
import ButtonWrapperWithBackground from '../../../shared/ui/button-wrapper-with-background';
import Grid from '../../../shared/ui/grid/grid';
import TextButton from '../../../shared/ui/text-button';

/**
 * Компонент Themes.
 *
 * Реализует интерфейс выбора тем с циклическим созданием кнопок
 * для каждой доступной темы из Redux store.
 *
 * @returns JSX элемент с кнопками выбора тем.
 */
function Themes() {
  const dispatch = useDispatch();
  const themes = useSelector(selectThemes);
  const activeTheme = useSelector(selectActiveTheme);

  /**
   * Обработчик выбора темы.
   * Применяет выбранную тему к приложению через Redux action.
   *
   * @param themeName - Название темы для активации.
   */
  const handleThemeSelect = (themeName: string) => {
    dispatch(setActiveTheme(themeName));
  };

  return (
    <Grid columns={3}>
      {themes.themes.map((theme) => {
        const isActive = theme.name === themes.activeTheme;
        // Использует цвет фона темы для активного состояния, цвет переднего плана для неактивного
        const backgroundColor = isActive
          ? theme.colors.foreground
          : theme.colors.background;
        const textColor = isActive ? theme.colors.main : theme.colors.main;

        return (
          <ButtonWrapperWithBackground
            key={theme.name}
            onClick={() => handleThemeSelect(theme.name)}
            style={{ backgroundColor }}>
            <TextButton
              style={{
                margin: 'auto',
                minHeight: '24px',
                color: textColor,
              }}
              text={theme.name}
              isDisabled
            />
          </ButtonWrapperWithBackground>
        );
      })}
    </Grid>
  );
}

export default Themes;
