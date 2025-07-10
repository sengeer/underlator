import React from 'react';
import useWindowSize from '../../hooks/use-window-size';

type size = 'S' | 'M' | 'L';

const sizeSet: Record<size, { width: number; height: number }> = {
  S: { width: 32, height: 32 },
  M: { width: 40, height: 40 },
  L: { width: 48, height: 48 },
};

interface WithAdaptiveSize {
  WrappedComponent: React.ComponentType<{ width: number; height: number }>;
}

function WithAdaptiveSize({ WrappedComponent }: WithAdaptiveSize) {
  const { width: windowWidth } = useWindowSize();

  const hasSizeS = windowWidth <= 768;
  const hasSizeM = windowWidth <= 1024;

  const size: size = hasSizeS ? 'S' : hasSizeM ? 'M' : 'L';

  const { width, height } = sizeSet[size];

  return <WrappedComponent width={width} height={height} />;
}

export default WithAdaptiveSize;
