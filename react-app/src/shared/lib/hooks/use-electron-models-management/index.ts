import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../../app';
import {
  checkModelsAvailability,
  downloadModel,
  deleteModel,
  updateDownloadProgress,
  selectModels,
  selectDownloadProgress,
  selectIsCheckingAvailability,
  selectAreRequiredModelsDownloaded,
  selectHasDownloadingModels,
  selectAvailableModels,
} from '../../../models/models-management-slice';

/**
 * A hook for managing machine translation models using the Electron IPC provider
 * Provides functions for checking, loading and deleting models
 */

export function useElectronModelsManagement() {
  const dispatch = useAppDispatch();

  const models = useSelector(selectModels);
  const downloadProgress = useSelector(selectDownloadProgress);
  const isCheckingAvailability = useSelector(selectIsCheckingAvailability);
  const areRequiredModelsDownloaded = useSelector(
    selectAreRequiredModelsDownloaded
  );
  const hasDownloadingModels = useSelector(selectHasDownloadingModels);
  const availableModels = useSelector(selectAvailableModels);

  // Check availability of models
  const checkAvailability = useCallback(() => {
    dispatch(checkModelsAvailability());
  }, [dispatch]);

  // Model downloading
  const handleDownloadModel = useCallback(
    (modelName: string) => {
      dispatch(downloadModel(modelName));
    },
    [dispatch]
  );

  // Delete a model
  const handleDeleteModel = useCallback(
    (modelName: string) => {
      dispatch(deleteModel(modelName));
    },
    [dispatch]
  );

  // Subscribe to download progress
  useEffect(() => {
    if (!window.electron?.models) return;

    const unsubscribe = window.electron.models.onDownloadProgress(
      (progress) => {
        dispatch(updateDownloadProgress(progress));
      }
    );

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get progress for a specific model
  const getModelProgress = useCallback(
    (modelName: string) => {
      return downloadProgress[modelName];
    },
    [downloadProgress]
  );

  // Getting information about model
  const getModelInfo = useCallback(
    (modelName: string) => {
      return models[modelName];
    },
    [models]
  );

  // Check if model is downloaded
  const isModelDownloaded = useCallback(
    (modelName: string) => {
      return models[modelName]?.status === 'downloaded';
    },
    [models]
  );

  // Check if model is downloading
  const isModelDownloading = useCallback(
    (modelName: string) => {
      return models[modelName]?.status === 'downloading';
    },
    [models]
  );

  // Get a list of models by status
  const getModelsByStatus = useCallback(
    (status: 'notDownloaded' | 'downloading' | 'downloaded' | 'error') => {
      return Object.values(models).filter((model) => model.status === status);
    },
    [models]
  );

  return {
    // States
    models,
    downloadProgress,
    isCheckingAvailability,
    areRequiredModelsDownloaded,
    hasDownloadingModels,
    availableModels,

    // Actions
    checkAvailability,
    downloadModel: handleDownloadModel,
    deleteModel: handleDeleteModel,

    // Utils
    formatFileSize,
    getModelProgress,
    getModelInfo,
    isModelDownloaded,
    isModelDownloading,
    getModelsByStatus,
  };
}
