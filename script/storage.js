const STORAGE_KEYS = {
  text: 'recitationText',
  progress: 'recitationProgress',
  config: 'recitationConfig',
};

export function loadText() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.text);
    return raw || null;
  } catch (e) {
    console.warn('Failed to load text from localStorage:', e);
    return null;
  }
}

export function saveText(text) {
  try {
    localStorage.setItem(STORAGE_KEYS.text, text);
    return true;
  } catch (e) {
    console.warn('Failed to save text to localStorage:', e);
    toast('保存失败，可能存储空间已满');
    return false;
  }
}

export function removeText() {
  try {
    localStorage.removeItem(STORAGE_KEYS.text);
  } catch (e) {
    console.warn('Failed to remove text from localStorage:', e);
  }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('Invalid progress data');

    return {
      mastered: Array.isArray(data.masteredSentences) ? data.masteredSentences : [],
      errors: Array.isArray(data.errorSentences) ? data.errorSentences : [],
      errorCounts: data.errorCounts && typeof data.errorCounts === 'object' ? data.errorCounts : {},
      sequenceIndex: typeof data.sequenceStartIndex === 'number' ? data.sequenceStartIndex : 0,
    };
  } catch (e) {
    console.warn('Failed to load progress, resetting:', e);
    localStorage.removeItem(STORAGE_KEYS.progress);
    return null;
  }
}

export function saveProgress(mastered, errors, errorCounts, sequenceIndex) {
  try {
    const data = {
      masteredSentences: Array.from(mastered),
      errorSentences: Array.from(errors),
      errorCounts: Object.fromEntries(errorCounts),
      sequenceStartIndex: sequenceIndex,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Failed to save progress:', e);
    return false;
  }
}

export function removeProgress() {
  try {
    localStorage.removeItem(STORAGE_KEYS.progress);
  } catch (e) {
    console.warn('Failed to remove progress:', e);
  }
}

export function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.config);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to load config:', e);
    localStorage.removeItem(STORAGE_KEYS.config);
    return null;
  }
}

export function saveConfigToStorage(config) {
  try {
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
    return true;
  } catch (e) {
    console.warn('Failed to save config:', e);
    return false;
  }
}

let toastTimer = null;

export function toast(msg, type = 'error') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    Object.assign(el.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      borderRadius: '8px',
      zIndex: '9999',
      transition: 'opacity .3s',
      opacity: '0',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold',
    });
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.style.background = type === 'error' ? '#f44336' : '#4CAF50';
  el.style.opacity = '1';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 2000);
}
