const SENTENCE_SEPARATOR = /([，。；！？：])/;

export function processText(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');

  const articles = [];
  const sentences = [];

  lines.forEach((line, index) => {
    const lineNumberMatch = line.match(/^(\d+→)/);
    const lineNumber = lineNumberMatch?.[1] || `${index + 1}→`;
    const content = line.replace(/^\d+→/, '');

    articles.push({
      id: index + 1,
      lineNumber,
      content,
      fullText: line,
    });

    const parts = content.split(SENTENCE_SEPARATOR).filter(Boolean);
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i].trim()) {
        const sentence = lineNumber + parts[i] + (parts[i + 1] || '');
        sentences.push(sentence);
      }
    }
  });

  return { articles, sentences };
}

export function splitContent(content) {
  return content.split(SENTENCE_SEPARATOR).filter(Boolean);
}

export function getAllArticleSentences(article, parts) {
  const sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i].trim()) {
      const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
      sentences.push(sentence);
    }
  }
  return sentences;
}

export function getAllValidPositions(parts) {
  const positions = [];
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i] && parts[i].trim()) {
      positions.push(i);
    }
  }
  return positions;
}
