/**
 * @module MessageBubble
 * Компонент для отображения отдельных сообщений чата.
 * Поддерживает различные типы сообщений, копирование и редактирование.
 */

import { useLingui } from '@lingui/react/macro';
import React, { useState, useRef, useEffect } from 'react';
import CheckIcon from '../../../shared/assets/icons/check-icon';
import CloseIcon from '../../../shared/assets/icons/close-icon';
import CopyIcon from '../../../shared/assets/icons/copy-icon';
import DeleteIcon from '../../../shared/assets/icons/delete-icon';
import EditIcon from '../../../shared/assets/icons/edit-icon';
import IconButton from '../../../shared/ui/icon-button';
import MarkdownRenderer from '../../../shared/ui/markdown-renderer';
import type {
  MessageBubbleProps,
  MessageBubbleState,
} from '../types/message-bubble';
import '../styles/message-bubble.scss';

function MessageBubble({
  message,
  isVisible = true,
  onCopy,
  onEdit,
  onDelete,
  className = '',
}: MessageBubbleProps) {
  const { t } = useLingui();
  const [state, setState] = useState<MessageBubbleState>({
    showActions: false,
    isEditing: false,
    editText: message.content,
    isCopied: false,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Автоматический фокус на textarea при редактировании
  useEffect(() => {
    if (state.isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [state.isEditing]);

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Обрабатывает копирование текста сообщения.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setState((prev) => ({ ...prev, isCopied: true }));

      // Сброс индикатора копирования через 2 секунды
      copyTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isCopied: false }));
      }, 2000);

      onCopy?.(message.content);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  /**
   * Обрабатывает начало редактирования сообщения.
   */
  const handleEdit = () => {
    setState((prev) => ({
      ...prev,
      isEditing: true,
      editText: message.content,
    }));
  };

  /**
   * Обрабатывает сохранение изменений при редактировании.
   */
  const handleSaveEdit = () => {
    if (state.editText.trim() && state.editText !== message.content) {
      onEdit?.(message.id, state.editText.trim());
    }
    setState((prev) => ({ ...prev, isEditing: false }));
  };

  /**
   * Обрабатывает отмену редактирования.
   */
  const handleCancelEdit = () => {
    setState((prev) => ({
      ...prev,
      isEditing: false,
      editText: message.content,
    }));
  };

  /**
   * Обрабатывает удаление сообщения.
   */
  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
      onDelete?.(message.id);
    }
  };

  /**
   * Обрабатывает изменения в поле редактирования.
   */
  const handleEditTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({ ...prev, editText: e.target.value }));
  };

  /**
   * Обрабатывает нажатие клавиш в поле редактирования.
   */
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  /**
   * Определяет CSS класс для роли сообщения.
   */
  const getRoleClass = () => {
    switch (message.role) {
      case 'user':
        return 'message-bubble_user';
      case 'assistant':
        return 'message-bubble_assistant';
      case 'system':
        return 'message-bubble_system';
      default:
        return 'message-bubble_assistant';
    }
  };

  /**
   * Форматирует временную метку для отображения.
   */
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  /**
   * Получает название роли для отображения.
   */
  const getRoleLabel = () => {
    switch (message.role) {
      case 'user':
        return t`User`;
      case 'assistant':
        return t`Assistant`;
      case 'system':
        return t`System`;
      default:
        return t`Unknown`;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`message-bubble ${getRoleClass()} ${className}`}>
      {/* Индикатор копирования */}
      {state.isCopied && (
        <div className='message-bubble__copy-indicator message-bubble__copy-indicator_visible'>
          Скопировано!
        </div>
      )}

      {/* Заголовок сообщения */}
      <div className='message-bubble__header'>
        <span className='message-bubble__role'>{getRoleLabel()}</span>
        <div className='message-bubble__actions'>
          <IconButton onClick={handleCopy} title={t`Copy message`}>
            <CopyIcon />
          </IconButton>
          {message.role === 'user' && (
            <IconButton onClick={handleEdit} title={t`Edit message`}>
              <EditIcon />
            </IconButton>
          )}
          <IconButton onClick={handleDelete} title={t`Delete message`}>
            <DeleteIcon />
          </IconButton>
        </div>
      </div>

      {/* Содержимое сообщения */}
      <div className='message-bubble__content'>
        {state.isEditing ? (
          <div className='message-bubble__edit-form'>
            <textarea
              ref={textareaRef}
              className='message-bubble__edit-textarea'
              value={state.editText}
              onChange={handleEditTextChange}
              onKeyDown={handleEditKeyDown}
              rows={3}
            />
            <div className='message-bubble__edit-actions'>
              <IconButton onClick={handleCancelEdit} title={t`Cancel editing`}>
                <CloseIcon />
              </IconButton>
              <IconButton onClick={handleSaveEdit} title={t`Save changes`}>
                <CheckIcon />
              </IconButton>
            </div>
          </div>
        ) : (
          <MarkdownRenderer
            content={message.content}
            className='markdown-content'
          />
        )}
      </div>

      {/* Подвал сообщения */}
      <div className='message-bubble__footer'>
        <span className='message-bubble__timestamp'>
          {formatTimestamp(message.timestamp)}
        </span>
        {message.model && (
          <div className='message-bubble__model-info'>
            <span>{message.model.name}</span>
            {message.model.provider && <span>({message.model.provider})</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
