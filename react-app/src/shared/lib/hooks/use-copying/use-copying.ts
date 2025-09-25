import { useState } from 'react';

function useCopying() {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy(output: string) {
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('❌ Failed to copy text: ', err);
    }
  }

  return {
    isCopied,
    handleCopy,
  };
}

export default useCopying;
