/**
 * @module ChatIpcTest
 * Функции для ручного тестирования Chat IPC API.
 * Используется для проверки работы Chat Electron IPC энпоинтов.
 */

import { electron } from '../../../shared/apis/chat-ipc';

/**
 * Создает новый чат.
 * Тестирует IPC endpoint chat:create.
 */
export async function testCreateChat(
  title = 'Тестовый чат',
  model = 'qwen3:0.6b'
) {
  console.log('🧪 Тестирование API создания чата...');
  try {
    const result = await electron.createChat({
      title,
      defaultModel: {
        name: model,
        provider: 'Ollama',
      },
      systemPrompt: 'Ты полезный ассистент для тестирования.',
      generationSettings: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      metadata: {
        test: true,
        createdBy: 'test-suite',
      },
    });

    console.log('✅ Результат создания чата:', result);
    return result;
  } catch (error) {
    console.error('❌ Ошибка создания чата:', error);
    throw error;
  }
}

/**
 * Получает список всех чатов.
 * Тестирует IPC endpoint chat:list.
 */
export async function testListChats() {
  console.log('🧪 Тестирование API получения списка чатов...');
  try {
    const result = await electron.listChats({
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    console.log('✅ Результат получения списка чатов:', result);
    if (result.success && result.data && result.data.chats) {
      console.log(`📋 Найдено ${result.data.chats.length} чатов`);
      result.data.chats.forEach((chat: any, index: number) => {
        console.log(
          `  ${index + 1}. ${chat.title} (${chat.messageCount} сообщений)`
        );
      });
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения списка чатов:', error);
    throw error;
  }
}

/**
 * Получает конкретный чат по ID.
 * Тестирует IPC endpoint chat:get.
 */
export async function testGetChat(chatId: string) {
  console.log(`🧪 Тестирование API получения чата ${chatId}...`);
  try {
    const result = await electron.getChat({
      chatId,
      includeMessages: true,
      messageLimit: 50,
    });

    console.log('✅ Результат получения чата:', result);
    if (result.success && result.data) {
      console.log(`📝 Чат: ${result.data.title}`);
      console.log(`📊 Сообщений: ${result.data.messages.length}`);
      console.log(`🕒 Создан: ${result.data.createdAt}`);
      console.log(`🔄 Обновлен: ${result.data.updatedAt}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения чата:', error);
    throw error;
  }
}

/**
 * Обновляет чат.
 * Тестирует IPC endpoint chat:update.
 */
export async function testUpdateChat(
  chatId: string,
  newTitle = 'Обновленный чат'
) {
  console.log(`🧪 Тестирование API обновления чата ${chatId}...`);
  try {
    const result = await electron.updateChat({
      chatId,
      title: newTitle,
      generationSettings: {
        temperature: 0.8,
        maxTokens: 1500,
      },
      metadata: {
        updatedBy: 'test-suite',
        updatedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Результат обновления чата:', result);
    if (result.success && result.data) {
      console.log(`📝 Обновленный чат: ${result.data.title}`);
      console.log(`🔄 Обновлен: ${result.data.updatedAt}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка обновления чата:', error);
    throw error;
  }
}

/**
 * Добавляет сообщение в чат.
 * Тестирует IPC endpoint chat:add-message.
 */
export async function testAddMessage(
  chatId: string,
  content = 'Привет! Это тестовое сообщение.'
) {
  console.log(`🧪 Тестирование API добавления сообщения в чат ${chatId}...`);
  try {
    const result = await electron.addMessage({
      chatId,
      role: 'user',
      content,
      metadata: {
        test: true,
        addedBy: 'test-suite',
      },
    });

    console.log('✅ Результат добавления сообщения:', result);
    if (result.success && result.data && result.data.message) {
      console.log(
        `📝 Добавлено сообщение: ${result.data.message.content.substring(0, 50)}...`
      );
      console.log(`🕒 Время: ${result.data.message.timestamp}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка добавления сообщения:', error);
    throw error;
  }
}

/**
 * Добавляет ответ ассистента в чат.
 * Тестирует IPC endpoint chat:add-message с ролью assistant.
 */
export async function testAddAssistantMessage(
  chatId: string,
  content = 'Привет! Я ассистент для тестирования.'
) {
  console.log(
    `🧪 Тестирование API добавления ответа ассистента в чат ${chatId}...`
  );
  try {
    const result = await electron.addMessage({
      chatId,
      role: 'assistant',
      content,
      model: {
        name: 'qwen3:0.6b',
        provider: 'Ollama',
      },
      metadata: {
        test: true,
        addedBy: 'test-suite',
      },
    });

    console.log('✅ Результат добавления ответа ассистента:', result);
    if (result.success && result.data && result.data.message) {
      console.log(
        `🤖 Ответ ассистента: ${result.data.message.content.substring(0, 50)}...`
      );
      console.log(`🕒 Время: ${result.data.message.timestamp}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка добавления ответа ассистента:', error);
    throw error;
  }
}

/**
 * Удаляет чат.
 * Тестирует IPC endpoint chat:delete.
 */
export async function testDeleteChat(chatId: string, createBackup = true) {
  console.log(`🧪 Тестирование API удаления чата ${chatId}...`);
  try {
    const result = await electron.deleteChat({
      chatId,
      createBackup,
      confirmed: true,
    });

    console.log('✅ Результат удаления чата:', result);
    if (result.success) {
      console.log(`🗑️ Чат ${result.deletedChatId} удален`);
      if (createBackup) {
        console.log('💾 Создана резервная копия');
      }
    }
    return result;
  } catch (error) {
    console.error('❌ Ошибка удаления чата:', error);
    throw error;
  }
}

// Экспорты для использования в других модулях
export default {
  testCreateChat,
  testListChats,
  testGetChat,
  testUpdateChat,
  testAddMessage,
  testAddAssistantMessage,
  testDeleteChat,
};
