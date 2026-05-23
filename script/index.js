import {
  getState,
  setArticles,
  setSequenceIndex,
  setConfig,
  addError,
  setErrorCounts,
} from './state.js';
import {
  loadText,
  loadProgress,
} from './storage.js';
import { loadConfig } from './config.js';
import { processText } from './parser.js';
import { generateArticleCloze } from './cloze.js';
import {
  renderClozeSection,
  renderAllPanels,
  renderModeToggle,
  enableGenerateBtn,
  handleTextInputDisplay,
} from './renderer.js';
import {
  bindButtonEvents,
  bindDelegatedEvents,
  bindKeyboardEvents,
} from './event.js';

function init() {
  const config = loadConfig();
  setConfig(config);

  const progress = loadProgress();
  if (progress) {
    Object.entries(progress.mastered).forEach(([sentence, interval]) => {
      getState().mastered.set(sentence, interval);
    });
    progress.errors.forEach(s => addError(s));
    setErrorCounts(new Map(Object.entries(progress.errorCounts)));
    setSequenceIndex(progress.sequenceIndex);
  }

  bindButtonEvents();
  bindKeyboardEvents();

  const text = loadText();
  if (text) {
    const { articles, sentences } = processText(text);
    setArticles(articles, sentences);
    enableGenerateBtn();

    const result = generateArticleCloze(getState().currentIndex);
    if (result) {
      if (getState().mode === 'sequence') {
        setSequenceIndex(result.newSequenceIndex);
      }
      renderClozeSection(result);
      bindDelegatedEvents();
    }
  } else {
    handleTextInputDisplay();
  }

  renderModeToggle();
  renderAllPanels();
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
