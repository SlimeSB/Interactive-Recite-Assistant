const state = {
  articles: [],
  sentences: [],
  mastered: new Map(),
  errors: new Set(),
  errorCounts: new Map(),
  currentIndex: 0,
  clozePositions: [],
  mode: 'random',
  sequenceIndex: 0,
  config: null,
  textLoaded: false,
};

const listeners = [];

export function getState() {
  return state;
}

export function getArticles() { return state.articles; }
export function getSentences() { return state.sentences; }
export function getMastered() { return state.mastered; }
export function getErrors() { return state.errors; }
export function getErrorCounts() { return state.errorCounts; }
export function getCurrentIndex() { return state.currentIndex; }
export function getClozePositions() { return state.clozePositions; }
export function getMode() { return state.mode; }
export function getSequenceIndex() { return state.sequenceIndex; }
export function getConfig() { return state.config; }
export function isTextLoaded() { return state.textLoaded; }

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

function notify() {
  listeners.forEach(fn => fn());
}

export function setArticles(articles, sentences) {
  state.articles = articles;
  state.sentences = sentences;
  state.textLoaded = articles.length > 0;
  notify();
}

export function setCurrentIndex(index) {
  state.currentIndex = index;
  notify();
}

export function setClozePositions(positions) {
  state.clozePositions = positions;
}

export function setMode(mode) {
  state.mode = mode;
  notify();
}

export function setSequenceIndex(index) {
  state.sequenceIndex = index;
}

export function setConfig(config) {
  state.config = config;
  notify();
}

export function isMastered(sentence) {
  const interval = state.mastered.get(sentence);
  return interval !== undefined && interval > 0;
}

export function getMasteredCount() {
  let count = 0;
  state.mastered.forEach(v => { if (v > 0) count++; });
  return count;
}

export function getMasteredSentences() {
  const result = new Set();
  state.mastered.forEach((interval, sentence) => {
    if (interval > 0) result.add(sentence);
  });
  return result;
}

export function getMasteredInterval(sentence) {
  return state.mastered.get(sentence) || 0;
}

export function markCorrect(sentence) {
  const current = state.mastered.get(sentence) || 0;
  const newInterval = current === 0 ? 1 : Math.min(current * 2, 64);
  state.mastered.set(sentence, newInterval);
  notify();
}

export function markIncorrect(sentence) {
  state.mastered.set(sentence, 0);
  notify();
}

export function removeMastered(sentence) {
  state.mastered.delete(sentence);
  notify();
}

export function addError(sentence) {
  state.errors.add(sentence);
  notify();
}

export function removeError(sentence) {
  state.errors.delete(sentence);
  notify();
}

export function incrementErrorCount(sentence) {
  const count = (state.errorCounts.get(sentence) || 0) + 1;
  state.errorCounts.set(sentence, count);
  notify();
}

export function setErrorCounts(countsMap) {
  state.errorCounts = countsMap;
  notify();
}

export function clearAllProgress() {
  state.mastered.clear();
  state.errors.clear();
  state.errorCounts.clear();
  state.sequenceIndex = 0;
  notify();
}

export function clearErrorStats() {
  state.errors.clear();
  state.errorCounts.clear();
  notify();
}
