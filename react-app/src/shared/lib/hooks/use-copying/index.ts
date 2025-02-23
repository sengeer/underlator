import { useState } from 'react';

export function useCopying() {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (output: string) => {
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return {
    isCopied,
    handleCopy,
  };
}
