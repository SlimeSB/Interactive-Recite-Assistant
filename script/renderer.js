import {
  getState,
  getArticles,
  getCurrentIndex,
  getMastered,
  getErrors,
  getErrorCounts,
  getSentences,
  removeMastered,
  removeError,
} from './state.js';
import { saveProgress } from './storage.js';

function persistProgress() {
  const state = getState();
  saveProgress(state.mastered, state.errors, state.errorCounts, state.sequenceIndex);
}

export function renderNavigation() {
  const total = getArticles().length;
  const current = getCurrentIndex() + 1;

  const navInfo = document.getElementById('articleNavInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  navInfo.textContent = `第 ${current} 篇 / 共 ${total} 篇`;
  prevBtn.disabled = getCurrentIndex() === 0;
  nextBtn.disabled = getCurrentIndex() >= total - 1;
}

export function renderStats() {
  const totalArticles = getArticles().length;
  const total = getSentences().length;
  const mastered = getMastered().size;
  const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

  document.getElementById('totalArticles').textContent = totalArticles;
  document.getElementById('totalSentences').textContent = total;
  document.getElementById('masteredCount').textContent = mastered;
  document.getElementById('accuracy').textContent = `${percentage}%`;
  document.getElementById('progressFill').style.width = `${percentage}%`;
  document.getElementById('progressText').textContent = `学习进度: ${percentage}%`;
}

export function renderClozeSection(result) {
  const { article, parts, clozePositions, allMastered } = result;
  const articleIndex = getCurrentIndex();
  const textSection = document.getElementById('textSection');

  let info = `<div class="article-info">${article.lineNumber}篇`;
  if (allMastered) {
    info += ' <span style="color: #4CAF50; font-weight: bold;">(已全部背诵)</span>';
    info += ' <button type="button" id="fullReciteBtn" class="full-recite-btn">全文默写</button>';
  }
  info += '</div>';

  let html = info;

  parts.forEach((part, i) => {
    if (clozePositions.includes(i) && part.trim()) {
      const originalText = part;
      const sentence = article.lineNumber + part + (parts[i + 1] || '');
      const inputId = `cloze-${articleIndex}-${i}`;
      const feedbackId = `feedback-${articleIndex}-${i}`;
      const btnId = `show-${articleIndex}-${i}`;

      html += `
        <div class="input-group">
          <input type="text" id="${inputId}" class="cloze-input" placeholder="请输入..."
                 data-original="${escapeAttr(originalText)}" data-sentence="${escapeAttr(sentence)}"
                 autocomplete="off" autocorrect="off" spellcheck="false">
          <button type="button" id="${btnId}" class="show-answer-btn"
                  data-input="${inputId}" data-original="${escapeAttr(originalText)}"
                  data-sentence="${escapeAttr(sentence)}" data-feedback="${feedbackId}">显</button>
          <span id="${feedbackId}" class="answer-feedback"></span>
        </div>`;
    } else {
      html += part;
    }
  });

  textSection.innerHTML = html;

  const firstInput = textSection.querySelector('.cloze-input');
  if (firstInput) firstInput.focus();

  checkAllInputsCompleted();
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function checkAllInputsCompleted() {
  const inputs = document.querySelectorAll('.cloze-input');
  const allCompleted = Array.from(inputs).every(input => input.disabled);

  const existingHint = document.getElementById('refreshHint');
  if (existingHint) existingHint.remove();

  if (allCompleted && inputs.length > 0) {
    const hint = document.createElement('div');
    hint.id = 'refreshHint';
    hint.style.cssText = 'text-align: center; color: #666; font-size: 14px; margin-top: 20px;';
    hint.textContent = '(按空格键刷新)';
    document.getElementById('textSection').appendChild(hint);
  }
}

export function areAllInputsCompleted() {
  const inputs = document.querySelectorAll('.cloze-input');
  return Array.from(inputs).every(input => input.disabled);
}

export function handleTextInputDisplay() {
  document.getElementById('textInputModal').style.display = 'block';
  document.getElementById('generateBtn').disabled = true;
}

export function hideTextInputModal() {
  document.getElementById('textInputModal').style.display = 'none';
  document.getElementById('articleTextarea').value = '';
}

export function enableGenerateBtn() {
  document.getElementById('generateBtn').disabled = false;
}

export function renderModeToggle() {
  const modeBtn = document.getElementById('modeToggleBtn');
  const clearBtn = document.getElementById('clearSequenceProgressBtn');
  const mode = getState().mode;

  if (mode === 'sequence') {
    modeBtn.textContent = '乱序模式';
    modeBtn.classList.add('active');
    clearBtn.disabled = false;
  } else {
    modeBtn.textContent = '顺序模式';
    modeBtn.classList.remove('active');
    clearBtn.disabled = true;
  }
}

function groupSentencesByArticle(sentences) {
  const grouped = new Map();
  sentences.forEach(sentence => {
    const articleId = sentence.match(/^(\d+→)/)?.[1] || '其他';
    if (!grouped.has(articleId)) grouped.set(articleId, []);
    grouped.get(articleId).push(sentence);
  });
  return grouped;
}

export function toggleCollapse(headerElement) {
  const container = headerElement.parentElement;
  const content = container.querySelector('.collapse-content');
  const arrow = container.querySelector('.collapse-arrow');
  content.classList.toggle('expanded');
  arrow.classList.toggle('expanded');
}

export function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const toggleIcon = document.getElementById(sectionId + 'Toggle');
  if (section.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
    toggleIcon.textContent = '▼';
  } else {
    section.classList.add('collapsed');
    toggleIcon.textContent = '▶';
  }
}

export function renderMasteredSentences() {
  const masteredDiv = document.getElementById('masteredSentencesList');
  masteredDiv.innerHTML = '';

  const mastered = getMastered();
  if (mastered.size === 0) {
    masteredDiv.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">暂无掌握的短句</div>';
    return;
  }

  const groupedSentences = groupSentencesByArticle(mastered);
  const currentArticle = getArticles()[getCurrentIndex()];
  const currentArticleId = currentArticle ? currentArticle.lineNumber : '';

  const otherArticles = [];
  let currentArticleGroup = null;

  groupedSentences.forEach((sentences, articleId) => {
    if (articleId === currentArticleId) {
      currentArticleGroup = { articleId, sentences };
    } else {
      otherArticles.push({ articleId, sentences });
    }
  });

  const renderOrder = [];
  if (currentArticleGroup) renderOrder.push(currentArticleGroup);

  otherArticles.sort((a, b) => {
    const aNum = parseInt(a.articleId.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.articleId.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  });
  renderOrder.push(...otherArticles);

  renderOrder.forEach(({ articleId, sentences }) => {
    const container = document.createElement('div');
    container.className = 'collapse-container';

    const isCurrent = articleId === currentArticleId;
    const header = document.createElement('div');
    header.className = `collapse-header ${isCurrent ? 'current' : ''}`;
    header.onclick = () => toggleCollapse(header);

    const headerText = document.createElement('span');
    headerText.textContent = `${articleId}篇 (${sentences.length}个短句)`;

    const arrow = document.createElement('span');
    arrow.className = 'collapse-arrow';
    arrow.textContent = '▶';

    header.appendChild(headerText);
    header.appendChild(arrow);

    const content = document.createElement('div');
    content.className = 'collapse-content';

    sentences.forEach(sentence => {
      const item = document.createElement('div');
      item.className = 'mastered-item';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = '删除该短句';
      deleteBtn.addEventListener('click', () => {
        removeMastered(sentence);
        persistProgress();
      });

      item.textContent = sentence;
      item.appendChild(deleteBtn);
      content.appendChild(item);
    });

    container.appendChild(header);
    container.appendChild(content);
    masteredDiv.appendChild(container);
  });
}

export function renderErrorSentences() {
  const errorDiv = document.getElementById('errorSentencesList');
  errorDiv.innerHTML = '';

  const errors = getErrors();
  if (errors.size === 0) {
    errorDiv.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">暂无易错短句</div>';
    return;
  }

  errors.forEach(sentence => {
    const item = document.createElement('div');
    item.className = 'error-item';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = '删除该短句';
    deleteBtn.addEventListener('click', () => {
      removeError(sentence);
      persistProgress();
    });

    item.textContent = sentence;
    item.appendChild(deleteBtn);
    errorDiv.appendChild(item);
  });
}

export function renderErrorStats() {
  const statsDiv = document.getElementById('errorStatsList');
  statsDiv.innerHTML = '';

  const errorCounts = getErrorCounts();
  const sortedErrors = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedErrors.forEach(([sentence, count]) => {
    const item = document.createElement('div');
    item.className = 'error-stat-item';
    item.textContent = `${sentence}: ${count}次`;
    statsDiv.appendChild(item);
  });
}

export function renderAllPanels() {
  renderMasteredSentences();
  renderErrorSentences();
  renderErrorStats();
  renderStats();
  renderNavigation();
}

export function renderConfigModal() {
  const config = getState().config;
  if (!config) return;

  document.getElementById('configMinCount').value = config.clozeConfig.minCount;
  document.getElementById('configSmallArticleRatio').value = config.clozeConfig.smallArticleRatio;
  document.getElementById('configLargeArticleMin').value = config.clozeConfig.largeArticleMin;
  document.getElementById('configLargeArticleMax').value = config.clozeConfig.largeArticleMax;
  document.getElementById('configSmallArticleThreshold').value = config.clozeConfig.smallArticleThreshold;
  document.getElementById('configReviewClozeCount').value = config.reviewConfig.reviewClozeCount;
  document.getElementById('configModal').style.display = 'block';
}

export function hideConfigModal() {
  document.getElementById('configModal').style.display = 'none';
}
