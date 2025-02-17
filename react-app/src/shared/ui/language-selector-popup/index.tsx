import React, { useState, useEffect } from 'react';
import Popup from '../popup';
import TextButton from '../text-button/text-button';

interface LanguageSelectorPopup {
  isOpened: boolean;
  setOpened: (value: boolean) => void;
  setSelectedLanguageKey: (value: string) => void;
  selectedLanguageValue: string;
  setSelectedLanguageValue: (value: string) => void;
  defaultLanguage: string;
}

export interface Languages {
  [key: string]: string;
}

const LANGUAGES: Languages = {
  english: 'eng',
  russian: 'rus',
};

function LanguageSelectorPopup({
  isOpened,
  setOpened,
  setSelectedLanguageKey,
  selectedLanguageValue,
  setSelectedLanguageValue,
  defaultLanguage,
}: LanguageSelectorPopup) {
  useEffect(() => {
    if (defaultLanguage) {
      const defaultKey = Object.keys(LANGUAGES).find(
        (key) => LANGUAGES[key] === defaultLanguage
      );
      if (defaultKey) {
        setSelectedLanguageKey(defaultKey);
        setSelectedLanguageValue(defaultLanguage);
      }
    }
  }, [defaultLanguage, setSelectedLanguageKey, setSelectedLanguageValue]);

  return (
    <Popup isOpened={isOpened} setOpened={setOpened}>
      <div className='language-selector-popup'>
        {Object.entries(LANGUAGES).map(([key, value]) => (
          <TextButton
            key={value}
            text={key}
            style={{ margin: '0.5rem 0' }}
            onClick={() => {
              setSelectedLanguageKey(key);
              setSelectedLanguageValue(value);
              setOpened(false);
            }}
            isActiveStyle={selectedLanguageValue === value}
          />
        ))}
      </div>
    </Popup>
  );
}

export default LanguageSelectorPopup;
