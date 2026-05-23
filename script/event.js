import {
  getState,
  getArticles,
  getCurrentIndex,
  getMastered,
  getErrors,
  getErrorCounts,
  getMode,
  getSequenceIndex,
  setCurrentIndex,
  setMode,
  setSequenceIndex,
  setArticles,
  setConfig,
  addMastered,
  removeMastered,
  addError,
  removeError,
  incrementErrorCount,
  clearAllProgress,
  clearErrorStats,
} from './state.js';
import { saveProgress, removeText, removeProgress, loadText as loadSavedText, saveText as saveTextToStorage, toast } from './storage.js';
import { saveConfig as saveConfigToStorage } from './config.js';
import { processText } from './parser.js';
import { generateArticleCloze, generateFullRecite } from './cloze.js';
import {
  renderClozeSection,
  renderAllPanels,
  renderModeToggle,
  renderConfigModal,
  hideConfigModal,
  enableGenerateBtn,
  hideTextInputModal,
  handleTextInputDisplay,
  areAllInputsCompleted,
  checkAllInputsCompleted,
  toggleSection,
} from './renderer.js';

function persistProgress() {
  const state = getState();
  saveProgress(state.mastered, state.errors, state.errorCounts, state.sequenceIndex);
}

function handleInputCompletion(input) {
  input.disabled = true;
  persistProgress();
  renderAllPanels();
}

function checkAnswer(event) {
  const input = event.target;
  if (!input.classList.contains('cloze-input')) return;

  const originalText = input.dataset.original;
  const userAnswer = input.value.trim();
  const feedbackElement = document.getElementById(input.id.replace('cloze', 'feedback'));
  const sentence = input.dataset.sentence;

  if (userAnswer === '') return;

  const state = getState();

  if (userAnswer === originalText) {
    input.classList.add('correct');
    input.classList.remove('incorrect');
    feedbackElement.textContent = '\u2705';
    feedbackElement.className = 'answer-feedback correct';

    const showBtn = document.getElementById(input.id.replace('cloze', 'show'));
    if (showBtn) showBtn.style.display = 'none';

    if (state.errors.has(sentence)) {
      removeError(sentence);
    } else {
      if (getMode() !== 'sequence' && !state.mastered.has(sentence)) {
        addMastered(sentence);
      }
    }

    if (getMode() === 'sequence') {
      const article = getArticles()[getCurrentIndex()];
      const allPositions = [];
      const parts = article.content.split(/([，。；！？：])/).filter(Boolean);
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) allPositions.push(i);
      }
      const positionMatch = input.id.match(/\d+-([0-9]+)$/);
      if (positionMatch) {
        const currentPosition = parseInt(positionMatch[1]);
        const currentIdx = allPositions.indexOf(currentPosition);
        setSequenceIndex(currentIdx + 1);
      }
    }

    handleInputCompletion(input);
  } else {
    input.classList.add('incorrect');
    input.classList.remove('correct');
    feedbackElement.textContent = '\u274C ' + originalText;
    feedbackElement.className = 'answer-feedback incorrect';

    const showBtn = document.getElementById(input.id.replace('cloze', 'show'));
    if (showBtn) showBtn.style.display = 'none';

    if (state.mastered.has(sentence)) {
      removeMastered(sentence);
    }

    addError(sentence);
    incrementErrorCount(sentence);

    handleInputCompletion(input);
  }

  checkAllInputsCompleted();
}

function showAnswer(event) {
  const btn = event.target;
  if (!btn.classList.contains('show-answer-btn')) return;

  const inputId = btn.dataset.input;
  const originalText = btn.dataset.original;
  const sentence = btn.dataset.sentence;
  const feedbackId = btn.dataset.feedback;

  const input = document.getElementById(inputId);
  const feedbackElement = document.getElementById(feedbackId);

  input.disabled = true;
  input.value = originalText;
  input.classList.add('incorrect');
  input.classList.remove('correct');
  feedbackElement.textContent = '\u274C';
  feedbackElement.className = 'answer-feedback incorrect';
  btn.style.display = 'none';

  const state = getState();
  if (state.mastered.has(sentence)) {
    removeMastered(sentence);
  }

  if (!state.errors.has(sentence)) {
    addError(sentence);
  }
  incrementErrorCount(sentence);

  persistProgress();
  renderAllPanels();
  handleInputCompletion(input);
}

function handleFullReciteClick(event) {
  const btn = event.target;
  if (!btn.matches('#fullReciteBtn')) return;

  const result = generateFullRecite(getCurrentIndex());
  if (result) {
    renderClozeSection(result);
  }
}

export function bindDelegatedEvents() {
  const textSection = document.getElementById('textSection');

  textSection.removeEventListener('blur', checkAnswer, true);
  textSection.addEventListener('blur', checkAnswer, true);

  textSection.removeEventListener('click', delegatedClick, false);
  textSection.addEventListener('click', delegatedClick, false);

  document.removeEventListener('click', globalDelegatedClick, false);
  document.addEventListener('click', globalDelegatedClick, false);
}

function delegatedClick(event) {
  if (event.target.classList.contains('show-answer-btn')) {
    showAnswer(event);
  } else if (event.target.matches('#fullReciteBtn')) {
    handleFullReciteClick(event);
  }
}

function globalDelegatedClick(event) {
  if (event.target.matches('#fullReciteBtn')) {
    handleFullReciteClick(event);
  }
}

export function bindButtonEvents() {
  document.getElementById('loadBtn').addEventListener('click', loadTextFile);
  document.getElementById('generateBtn').addEventListener('click', generateClozeTest);
  document.getElementById('prevBtn').addEventListener('click', showPreviousArticle);
  document.getElementById('nextBtn').addEventListener('click', showNextArticle);
  document.getElementById('clearErrorStatsBtn').addEventListener('click', clearErrorStatsHandler);
  document.getElementById('modeToggleBtn').addEventListener('click', toggleMode);
  document.getElementById('clearSequenceProgressBtn').addEventListener('click', clearSequenceProgress);
  document.getElementById('clearAllProgressBtn').addEventListener('click', clearAllProgressHandler);
  document.getElementById('saveBtn').addEventListener('click', saveArticle);
  document.getElementById('cancelBtn').addEventListener('click', cancelArticle);
  document.getElementById('configBtn').addEventListener('click', renderConfigModal);
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfigHandler);
  document.getElementById('cancelConfigBtn').addEventListener('click', hideConfigModal);
  document.getElementById('errorSectionHeader').addEventListener('click', () => {
    toggleSection('errorSection');
  });
}

function loadTextFile() {
  const text = loadSavedText();
  if (text) {
    const { articles, sentences } = processText(text);
    setArticles(articles, sentences);
    enableGenerateBtn();
    generateClozeTest();
    renderAllPanels();
  } else {
    handleTextInputDisplay();
  }
}

function saveArticle() {
  const textarea = document.getElementById('articleTextarea');
  const text = textarea.value.trim();

  if (text) {
    saveTextToStorage(text);
    hideTextInputModal();
    const { articles, sentences } = processText(text);
    setArticles(articles, sentences);
    enableGenerateBtn();
    generateClozeTest();
    renderAllPanels();
  } else {
    toast('请输入背诵文章内容');
  }
}

function cancelArticle() {
  hideTextInputModal();
  const state = getState();
  if (!state.textLoaded) {
    handleTextInputDisplay();
  }
}

function generateClozeTest() {
  const state = getState();
  if (state.articles.length === 0) {
    toast('请先加载题库！');
    return;
  }
  const result = generateArticleCloze(state.currentIndex);
  if (result) {
    if (state.mode === 'sequence') {
      setSequenceIndex(result.newSequenceIndex);
    }
    renderClozeSection(result);
    bindDelegatedEvents();
  }
}

function showPreviousArticle() {
  const state = getState();
  if (state.currentIndex > 0) {
    setCurrentIndex(state.currentIndex - 1);
    generateClozeTest();
    renderAllPanels();
  }
}

function showNextArticle() {
  const state = getState();
  if (state.currentIndex < state.articles.length - 1) {
    setCurrentIndex(state.currentIndex + 1);
    generateClozeTest();
    renderAllPanels();
  }
}

function toggleMode() {
  const currentMode = getMode();
  setMode(currentMode === 'random' ? 'sequence' : 'random');
  renderModeToggle();
  generateClozeTest();
}

function clearSequenceProgress() {
  setSequenceIndex(0);
  persistProgress();
  generateClozeTest();
}

function clearAllProgressHandler() {
  if (confirm('确定要清除所有学习进度吗？此操作不可恢复。')) {
    clearAllProgress();
    removeText();
    removeProgress();
    loadTextFile();
    renderAllPanels();
  }
}

function clearErrorStatsHandler() {
  clearErrorStats();
  persistProgress();
  renderAllPanels();
}

function saveConfigHandler() {
  const newConfig = {
    clozeConfig: {
      minCount: parseInt(document.getElementById('configMinCount').value),
      smallArticleRatio: parseFloat(document.getElementById('configSmallArticleRatio').value),
      largeArticleMin: parseInt(document.getElementById('configLargeArticleMin').value),
      largeArticleMax: parseInt(document.getElementById('configLargeArticleMax').value),
      smallArticleThreshold: parseInt(document.getElementById('configSmallArticleThreshold').value),
    },
    reviewConfig: {
      reviewClozeCount: parseInt(document.getElementById('configReviewClozeCount').value),
    },
    uiConfig: {
      errorSectionDefaultCollapsed: getState().config?.uiConfig?.errorSectionDefaultCollapsed || true,
    },
  };

  saveConfigToStorage(newConfig);
  setConfig(newConfig);
  hideConfigModal();
  generateClozeTest();
}

export function bindKeyboardEvents() {
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event) {
  const key = event.key;
  const inputs = document.querySelectorAll('.cloze-input');

  if (key >= '1' && key <= '9') {
    const index = parseInt(key) - 1;
    if (index < inputs.length) inputs[index].focus();
    event.preventDefault();
  } else if (key === 'Tab') {
    handleTabKey(event, inputs);
  } else if (key === ' ' && areAllInputsCompleted()) {
    event.preventDefault();
    generateClozeTest();
  } else if (key === '+') {
    event.preventDefault();
    showNextArticle();
  } else if (key === '-') {
    event.preventDefault();
    showPreviousArticle();
  }
}

function handleTabKey(event, allInputs) {
  if (!event.target.classList.contains('cloze-input')) return;
  event.preventDefault();

  const input = event.target;
  let nextIndex = Array.from(allInputs).indexOf(input) + 1;

  while (nextIndex < allInputs.length && allInputs[nextIndex].disabled) {
    nextIndex++;
  }

  if (nextIndex < allInputs.length) {
    allInputs[nextIndex].focus();
  } else {
    let firstActiveIndex = -1;
    for (let i = 0; i < allInputs.length; i++) {
      if (!allInputs[i].disabled) {
        firstActiveIndex = i;
        break;
      }
    }
    if (firstActiveIndex >= 0 && firstActiveIndex !== Array.from(allInputs).indexOf(input)) {
      allInputs[firstActiveIndex].focus();
    } else {
      input.blur();
    }
  }
}
