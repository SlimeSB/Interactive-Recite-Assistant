import {
  getAllArticleSentences,
  getAllValidPositions,
} from './parser.js';
import {
  getState,
  getArticles,
  getMode,
  getSequenceIndex,
} from './state.js';

function generateRandomPositions(availablePositions, count) {
  const positions = [...availablePositions];
  const result = [];

  while (result.length < count && positions.length > 0) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    result.push(positions[randomIndex]);
    positions.splice(randomIndex, 1);
  }

  return result;
}

export function generateSequenceClozePositions(article, parts, mastered, sequenceStartIndex) {
  const allPositions = getAllValidPositions(parts);
  const clozePositions = [];

  let startIdx = sequenceStartIndex;
  if (startIdx >= allPositions.length) {
    startIdx = 0;
  }

  let currentIdx = startIdx;
  while (currentIdx < allPositions.length) {
    const position = allPositions[currentIdx];
    const sentence = article.lineNumber + parts[position] + (parts[position + 1] || '');
    if (!mastered.has(sentence)) {
      clozePositions.push(position);
      break;
    }
    currentIdx++;
  }

  if (clozePositions.length === 0) {
    for (let i = 0; i < allPositions.length; i++) {
      const position = allPositions[i];
      const sentence = article.lineNumber + parts[position] + (parts[position + 1] || '');
      if (!mastered.has(sentence)) {
        clozePositions.push(position);
        break;
      }
    }
  }

  return { clozePositions, nextStartIndex: sequenceStartIndex + clozePositions.length };
}

export function generateArticleCloze(articleIndex) {
  const state = getState();
  const articles = getArticles();
  const article = articles[articleIndex];
  if (!article) return null;

  const parts = article.content.split(/([，。；！？：])/).filter(Boolean);
  const allArticleSentences = getAllArticleSentences(article, parts);
  const allMastered = allArticleSentences.every(s => state.mastered.has(s));

  const availablePositions = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i].trim()) {
      const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
      if (!state.mastered.has(sentence)) {
        availablePositions.push(i);
      }
    }
  }

  const clozeConfig = state.config?.clozeConfig || {
    minCount: 1,
    smallArticleRatio: 0.3,
    largeArticleMin: 3,
    largeArticleMax: 5,
    smallArticleThreshold: 10,
  };

  const reviewConfig = state.config?.reviewConfig || { reviewClozeCount: 1 };

  let clozeCount;
  let clozePositions = [];
  let newSequenceIndex = state.sequenceIndex;

  if (allMastered) {
    clozeCount = reviewConfig.reviewClozeCount;
    const allPositions = getAllValidPositions(parts);
    clozePositions = generateRandomPositions(allPositions, clozeCount);
  } else {
    const sentenceCount = allArticleSentences.length;

    if (sentenceCount < clozeConfig.smallArticleThreshold) {
      clozeCount = Math.max(
        clozeConfig.minCount,
        Math.floor(sentenceCount * clozeConfig.smallArticleRatio)
      );
    } else {
      const calculatedCount = Math.floor(parts.length / 6);
      clozeCount = Math.min(
        Math.max(clozeConfig.largeArticleMin, calculatedCount),
        clozeConfig.largeArticleMax
      );
    }

    if (getMode() === 'sequence') {
      clozeCount = 1;
      const result = generateSequenceClozePositions(article, parts, state.mastered, getSequenceIndex());
      clozePositions = result.clozePositions;
      newSequenceIndex = result.nextStartIndex;
    } else {
      clozePositions = generateRandomPositions(availablePositions, clozeCount);
    }
  }

  return { article, parts, clozePositions, allMastered, newSequenceIndex };
}

export function generateFullRecite(articleIndex) {
  const articles = getArticles();
  const article = articles[articleIndex];
  if (!article) return null;

  const parts = article.content.split(/([，。；！？：])/).filter(Boolean);
  const allPositions = getAllValidPositions(parts);

  return { article, parts, clozePositions: allPositions, allMastered: true };
}
