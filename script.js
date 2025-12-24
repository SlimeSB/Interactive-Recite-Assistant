// 全局变量
let allArticles = []; // 存储所有文章
let allSentences = []; // 存储所有短句
let masteredSentences = new Set(); // 已掌握的短句
let errorSentences = new Set(); // 易错短句
let errorCounts = new Map(); // 错误次数统计 {sentence: count}
let currentArticleIndex = 0; // 当前文章索引
let currentClozePositions = []; // 当前文章的挖空位置
let config = null; // 配置对象

// 初始化
document.addEventListener('DOMContentLoaded', function () {
    // 加载配置
    loadConfig()
        .then(() => {
            // 从本地存储加载学习进度
            loadProgress();

            // 自动加载题库
            loadTextFile();

            // 绑定事件
            bindEventListeners();
        })
        .catch(error => {
            console.error('加载配置失败，使用默认配置:', error);
            // 使用默认配置
            config = {
                "questionFile": "背诵.txt",
                "clozeConfig": {
                    "minCount": 1,
                    "smallArticleRatio": 0.3,
                    "largeArticleMin": 3,
                    "largeArticleMax": 5,
                    "smallArticleThreshold": 10
                },
                "reviewConfig": {
                    "reviewClozeCount": 1
                },
                "uiConfig": {
                    "errorSectionDefaultCollapsed": true
                }
            };

            // 继续初始化
            loadProgress();
            loadTextFile();

            // 绑定事件
            bindEventListeners();
        });
});

// 绑定事件监听器
function bindEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', loadTextFile);
    document.getElementById('generateBtn').addEventListener('click', generateClozeTest);
    document.getElementById('prevBtn').addEventListener('click', showPreviousArticle);
    document.getElementById('nextBtn').addEventListener('click', showNextArticle);
    document.getElementById('clearErrorStatsBtn').addEventListener('click', clearErrorStats);
}

// 获取文章的所有短句
function getAllArticleSentences(article, parts) {
    const sentences = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) {
            const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
            sentences.push(sentence);
        }
    }
    return sentences;
}

// 获取所有有效的位置（可挖空的位置）
function getAllValidPositions(parts) {
    const positions = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) {
            positions.push(i);
        }
    }
    return positions;
}

// 生成随机位置
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

// 加载配置文件
async function loadConfig() {
    const response = await fetch('config.json');
    if (!response.ok) {
        throw new Error('配置文件加载失败');
    }
    config = await response.json();
}

// 可折叠section切换函数
function toggleSection(sectionId) {
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

// 折叠列表切换函数
function toggleCollapse(headerElement) {
    const container = headerElement.parentElement;
    const content = container.querySelector('.collapse-content');
    const arrow = container.querySelector('.collapse-arrow');

    content.classList.toggle('expanded');
    arrow.classList.toggle('expanded');
}

// 加载文本文件
function loadTextFile() {
    const questionFile = config?.questionFile || '背诵.txt';
    fetch(questionFile)
        .then(response => {
            if (!response.ok) {
                throw new Error('文件加载失败');
            }
            return response.text();
        })
        .then(text => {
            processText(text);
            updateStats();
            document.getElementById('generateBtn').disabled = false;
            // 自动生成新题目
            generateClozeTest();
        })
        .catch(error => {
            console.error('加载文件时出错:', error);
            alert('加载文件失败，请检查文件是否存在。');
        });
}

// 处理文本
function processText(text) {
    // 按行分割，去除空行
    const lines = text.split('\n').filter(line => line.trim() !== '');

    // 存储所有文章
    allArticles = [];
    allSentences = [];

    lines.forEach((line, index) => {
        // 解析行号和内容
        const lineNumberMatch = line.match(/^(\d+→)/);
        const lineNumber = lineNumberMatch?.[1] || `${index + 1}→`;
        const content = line.replace(/^\d+→/, '');

        // 保存完整文章
        allArticles.push({
            id: index + 1,
            lineNumber: lineNumber,
            content: content,
            fullText: line
        });

        // 将文章拆分为短句，用于统计
        const sentences = content.split(/([，。；！？：])/).filter(Boolean);
        for (let i = 0; i < sentences.length; i += 2) {
            if (sentences[i] && sentences[i].trim()) {
                const sentence = sentences[i] + (sentences[i + 1] || '');
                allSentences.push(lineNumber + sentence);
            }
        }
    });

    // 更新导航信息
    updateNavigation();
}

// 生成填空题
function generateClozeTest() {
    if (allArticles.length === 0) {
        alert('请先加载题库！');
        return;
    }

    // 生成当前文章的填空题
    generateArticleCloze(currentArticleIndex);
}

// 生成全文默写
function generateFullRecite(articleIndex) {
    const article = allArticles[articleIndex];
    if (!article) return;

    // 将文章内容按标点符号分割
    const parts = article.content.split(/([，。；！？：])/).filter(Boolean);

    // 获取所有有效的位置（所有短句都挖空）
    const allPositions = getAllValidPositions(parts);

    // 保存当前挖空位置
    currentClozePositions = allPositions;

    // 生成带挖空的文章HTML
    displayArticleWithCloze(article, parts, allPositions);
}

// 生成单篇文章的填空题
function generateArticleCloze(articleIndex) {
    const article = allArticles[articleIndex];
    if (!article) return;

    // 将文章内容按标点符号分割
    const parts = article.content.split(/([，。；！？：])/).filter(Boolean);

    // 获取当前文章的所有短句
    const allArticleSentences = getAllArticleSentences(article, parts);

    // 检查是否所有短句都已掌握
    const allMastered = allArticleSentences.every(sentence => masteredSentences.has(sentence));

    // 过滤掉已掌握的短句
    const availablePositions = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) {
            const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
            if (!masteredSentences.has(sentence)) {
                availablePositions.push(i);
            }
        }
    }

    let clozeCount;
    let clozePositions = [];

    // 从配置中获取挖空相关参数
    const clozeConfig = config?.clozeConfig || {
        minCount: 1,
        smallArticleRatio: 0.3,
        largeArticleMin: 3,
        largeArticleMax: 5,
        smallArticleThreshold: 10
    };

    const reviewConfig = config?.reviewConfig || {
        reviewClozeCount: 1
    };

    if (allMastered) {
        // 所有短句都已掌握，进入复习模式
        clozeCount = reviewConfig.reviewClozeCount;

        // 随机选择挖空位置（从所有位置中选择）
        const allPositions = getAllValidPositions(parts);

        // 生成随机挖空位置
        clozePositions = generateRandomPositions(allPositions, clozeCount);
    } else {
        // 正常模式
        // 计算当前篇的词条数量
        const sentenceCount = allArticleSentences.length;

        // 根据词条数量确定挖空数量
        if (sentenceCount < clozeConfig.smallArticleThreshold) {
            // 小文章，按比例挖空
            clozeCount = Math.max(
                clozeConfig.minCount,
                Math.floor(sentenceCount * clozeConfig.smallArticleRatio)
            );
        } else {
            // 大文章，固定范围挖空
            const calculatedCount = Math.floor(parts.length / 6);
            clozeCount = Math.min(
                Math.max(clozeConfig.largeArticleMin, calculatedCount),
                clozeConfig.largeArticleMax
            );
        }

        // 生成随机挖空位置
        clozePositions = generateRandomPositions(availablePositions, clozeCount);

    }

    // 保存当前挖空位置
    currentClozePositions = clozePositions;

    // 生成带挖空的文章HTML
    displayArticleWithCloze(article, parts, clozePositions);
}

// 显示带挖空的文章
function displayArticleWithCloze(article, parts, clozePositions) {
    const textSection = document.getElementById('textSection');

    // 检查当前文章是否所有短句都已掌握
    const allArticleSentences = getAllArticleSentences(article, parts);

    const allMastered = allArticleSentences.every(sentence => masteredSentences.has(sentence));

    // 添加文章标题，包括已全部背诵标记
    let articleInfo = `${article.lineNumber}篇`;
    if (allMastered) {
        articleInfo += ` <span style="color: #4CAF50; font-weight: bold;">(已全部背诵)</span>`;
        articleInfo += ` <button type="button" id="fullReciteBtn" class="full-recite-btn">全文默写</button>`;
    }

    let html = `<div class="article-info">${articleInfo}</div>`;

    parts.forEach((part, i) => {
        if (clozePositions.includes(i) && part.trim()) {
            // 挖空部分
            const originalText = part;
            const sentence = article.lineNumber + part + (parts[i + 1] || '');
            const inputId = `cloze-${currentArticleIndex}-${i}`;
            const feedbackId = `feedback-${currentArticleIndex}-${i}`;
            const btnId = `show-${currentArticleIndex}-${i}`;

            html += `
                <div class="input-group">
                    <input type="text" id="${inputId}" class="cloze-input" placeholder="请输入..." 
                           data-original="${originalText}" data-sentence="${sentence}" 
                           autocomplete="off" autocorrect="off" spellcheck="false">
                    <button type="button" id="${btnId}" class="show-answer-btn" 
                            data-input="${inputId}" data-original="${originalText}" data-sentence="${sentence}" 
                            data-feedback="${feedbackId}">显</button>
                    <span id="${feedbackId}" class="answer-feedback"></span>
                </div>
            `;
        } else {
            // 普通文本
            html += part;
        }
    });

    textSection.innerHTML = html;

    // 绑定输入事件
    document.querySelectorAll('.cloze-input').forEach(input => {
        input.addEventListener('blur', checkAnswer);
    });

    // 绑定显示答案按钮事件
    document.querySelectorAll('.show-answer-btn').forEach(btn => {
        btn.addEventListener('click', showAnswer);
    });

    // 绑定全文默写按钮事件
    const fullReciteBtn = document.getElementById('fullReciteBtn');
    if (fullReciteBtn) {
        fullReciteBtn.addEventListener('click', () => {
            generateFullRecite(currentArticleIndex);
        });
    }

    // 添加键盘事件监听器
    addKeyboardEventListeners();

    // 检查所有输入框是否已完成
    checkAllInputsCompleted();

    // 自动聚焦到第一个输入框
    const firstInput = document.querySelector('.cloze-input');
    if (firstInput) {
        firstInput.focus();
    }
}

// 显示答案功能
function showAnswer(event) {
    const btn = event.target;
    const inputId = btn.dataset.input;
    const originalText = btn.dataset.original;
    const sentence = btn.dataset.sentence;
    const feedbackId = btn.dataset.feedback;

    const input = document.getElementById(inputId);
    const feedbackElement = document.getElementById(feedbackId);

    // 先禁用输入框，防止blur事件触发checkAnswer函数
    input.disabled = true;

    // 显示正确答案
    input.value = originalText;

    // 标记为错误
    input.classList.add('incorrect');
    input.classList.remove('correct');
    feedbackElement.textContent = `❌`;
    feedbackElement.className = 'answer-feedback incorrect';

    // 隐藏"显"按钮
    btn.style.display = 'none';

    // 如果句子在已掌握集合中，移除它
    if (masteredSentences.has(sentence)) {
        masteredSentences.delete(sentence);
        // 重新渲染掌握栏
        renderMasteredSentences();
    }

    // 添加到易错栏
    if (!errorSentences.has(sentence)) {
        errorSentences.add(sentence);
        addToErrorSentences(sentence);
    }

    // 更新错误次数
    const currentError = errorCounts.get(sentence) || 0;
    errorCounts.set(sentence, currentError + 1);

    // 更新错误统计显示
    displayErrorStats();

    // 处理输入完成（这里会再次禁用输入框，但不会有影响）
    handleInputCompletion(input);
}

// 检查答案
function checkAnswer(event) {
    const input = event.target;
    const originalText = input.dataset.original;
    const userAnswer = input.value.trim();
    const feedbackElement = document.getElementById(input.id.replace('cloze', 'feedback'));
    const sentence = input.dataset.sentence;

    // 如果输入为空，不进行操作
    if (userAnswer === '') {
        return;
    }

    if (userAnswer === originalText) {
        // 正确
        input.classList.add('correct');
        input.classList.remove('incorrect');
        feedbackElement.textContent = `✅`;
        feedbackElement.className = 'answer-feedback correct';

        // 隐藏"显"按钮
        const showBtn = document.getElementById(input.id.replace('cloze', 'show'));
        if (showBtn) {
            showBtn.style.display = 'none';
        }

        // 检查是否在易错栏
        if (errorSentences.has(sentence)) {
            // 如果在易错栏，只从易错栏移除
            removeFromErrorSentences(sentence);
        } else {
            // 如果不在易错栏，添加到掌握栏
            if (!masteredSentences.has(sentence)) {
                masteredSentences.add(sentence);
                addToMasteredSentences(sentence);
            }
        }

        // 处理输入完成
        handleInputCompletion(input);
    } else {
        // 错误
        input.classList.add('incorrect');
        input.classList.remove('correct');
        feedbackElement.textContent = `❌ ${originalText}`;
        feedbackElement.className = 'answer-feedback incorrect';

        // 隐藏"显"按钮
        const showBtn = document.getElementById(input.id.replace('cloze', 'show'));
        if (showBtn) {
            showBtn.style.display = 'none';
        }

        // 如果句子在已掌握集合中，移除它
        if (masteredSentences.has(sentence)) {
            masteredSentences.delete(sentence);
            // 重新渲染掌握栏
            renderMasteredSentences();
        }

        // 添加到易错栏
        if (!errorSentences.has(sentence)) {
            errorSentences.add(sentence);
            addToErrorSentences(sentence);
        }

        // 更新错误次数
        const currentError = errorCounts.get(sentence) || 0;
        errorCounts.set(sentence, currentError + 1);

        // 更新错误统计显示
        displayErrorStats();

        // 处理输入完成
        handleInputCompletion(input);
    }
}

// 处理输入完成
function handleInputCompletion(input) {
    // 锁定输入框
    input.disabled = true;

    // 保存进度
    saveProgress();
    updateStats();

    // 检查所有输入框是否已完成
    checkAllInputsCompleted();
}

// 添加键盘事件监听器
function addKeyboardEventListeners() {
    // 移除之前的事件监听器，避免重复绑定
    document.removeEventListener('keydown', handleKeyDown);

    // 添加新的事件监听器
    document.addEventListener('keydown', handleKeyDown);
}

// 处理键盘事件
function handleKeyDown(event) {
    const key = event.key;
    const inputs = document.querySelectorAll('.cloze-input');

    // 1-9数字键切换输入框
    if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        if (index < inputs.length) {
            inputs[index].focus();
        }
        event.preventDefault();
    }

    // Tab键在输入框间循环切换
    else if (key === 'Tab') {
        // 检查是否在输入框上
        if (event.target.classList.contains('cloze-input')) {
            const input = event.target;

            // 获取所有输入框
            const allInputs = document.querySelectorAll('.cloze-input');
            
            event.preventDefault();
            
            // 查找下一个可用输入框
            let nextIndex = Array.from(allInputs).indexOf(input) + 1;
            
            // 检查下一个输入框是否存在且未禁用
            while (nextIndex < allInputs.length && allInputs[nextIndex].disabled) {
                nextIndex++;
            }
            
            // 如果找到下一个可用输入框，切换到它
            if (nextIndex < allInputs.length) {
                allInputs[nextIndex].focus();
            } 
            // 否则从头搜索有没有空余的输入框
            else {
                // 查找第一个未禁用的输入框
                let firstActiveIndex = -1;
                for (let i = 0; i < allInputs.length; i++) {
                    if (!allInputs[i].disabled) {
                        firstActiveIndex = i;
                        break;
                    }
                }
                
                // 如果找到且不是当前输入框，切换到它
                if (firstActiveIndex >= 0 && firstActiveIndex !== Array.from(allInputs).indexOf(input)) {
                    allInputs[firstActiveIndex].focus();
                } 
                // 否则，只有自身，失去焦点
                else {
                    input.blur();
                }
            }
        }
    }

    // 空格键刷新功能（仅当所有输入框都已完成时）
    else if (key === ' ' && areAllInputsCompleted()) {
        event.preventDefault();
        generateClozeTest();
    }

    // +键进入下一篇
    else if (key === '+') {
        event.preventDefault();
        showNextArticle();
    }

    // -键进入上一篇
    else if (key === '-') {
        event.preventDefault();
        showPreviousArticle();
    }
}

// 检查所有输入框是否已完成
function checkAllInputsCompleted() {
    const inputs = document.querySelectorAll('.cloze-input');
    const allCompleted = areAllInputsCompleted();

    // 移除之前的刷新提示
    const existingHint = document.getElementById('refreshHint');
    if (existingHint) {
        existingHint.remove();
    }

    // 如果所有输入框都已完成，显示刷新提示
    if (allCompleted && inputs.length > 0) {
        const textSection = document.getElementById('textSection');
        const hint = document.createElement('div');
        hint.id = 'refreshHint';
        hint.style.cssText = 'text-align: center; color: #666; font-size: 14px; margin-top: 20px;';
        hint.textContent = '(按空格键刷新)';
        textSection.appendChild(hint);
    }
}

// 判断所有输入框是否已完成
function areAllInputsCompleted() {
    const inputs = document.querySelectorAll('.cloze-input');
    return Array.from(inputs).every(input => input.disabled);
}

// 按文章分组掌握的句子
function groupSentencesByArticle(sentences) {
    const grouped = new Map();

    sentences.forEach(sentence => {
        // 提取文章标识（行号前缀，如"1→"）
        const articleId = sentence.match(/^(\d+→)/)?.[1] || '其他';

        if (!grouped.has(articleId)) {
            grouped.set(articleId, []);
        }
        grouped.get(articleId).push(sentence);
    });

    return grouped;
}

// 渲染掌握栏
function renderMasteredSentences() {
    const masteredDiv = document.getElementById('masteredSentencesList');
    masteredDiv.innerHTML = '';

    if (masteredSentences.size === 0) {
        masteredDiv.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">暂无掌握的短句</div>';
        return;
    }

    // 按文章分组
    const groupedSentences = groupSentencesByArticle(masteredSentences);

    // 获取当前文章标识
    const currentArticle = allArticles[currentArticleIndex];
    const currentArticleId = currentArticle ? currentArticle.lineNumber : '';

    // 分离当前篇和其他篇
    const otherArticles = [];
    let currentArticleGroup = null;

    groupedSentences.forEach((sentences, articleId) => {
        if (articleId === currentArticleId) {
            currentArticleGroup = { articleId, sentences };
        } else {
            otherArticles.push({ articleId, sentences });
        }
    });

    // 渲染顺序：当前篇（如果有）→ 其他篇按文章ID排序
    const renderOrder = [];
    if (currentArticleGroup) {
        renderOrder.push(currentArticleGroup);
    }

    // 其他篇按文章ID排序
    otherArticles.sort((a, b) => {
        // 提取数字部分进行排序
        const aNum = parseInt(a.articleId.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.articleId.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
    });

    renderOrder.push(...otherArticles);

    // 渲染所有分组
    renderOrder.forEach(({ articleId, sentences }) => {
        const container = document.createElement('div');
        container.className = `collapse-container`;

        // 创建头部
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

        // 创建内容
        const content = document.createElement('div');
        content.className = 'collapse-content';

        // 添加句子
        sentences.forEach(sentence => {
            const sentenceItem = document.createElement('div');
            sentenceItem.className = 'mastered-item';

            // 创建删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = '删除该短句';

            // 添加删除事件
            deleteBtn.addEventListener('click', function () {
                deleteMasteredSentence(sentence, sentenceItem);
            });

            // 设置内容和按钮
            sentenceItem.textContent = sentence;
            sentenceItem.appendChild(deleteBtn);

            content.appendChild(sentenceItem);
        });

        // 组装容器
        container.appendChild(header);
        container.appendChild(content);
        masteredDiv.appendChild(container);
    });
}

// 添加到掌握栏
function addToMasteredSentences(sentence) {
    // 直接重新渲染整个掌握栏
    renderMasteredSentences();
}

// 删除已掌握的短句
function deleteMasteredSentence(sentence, element) {
    // 从集合中删除
    masteredSentences.delete(sentence);

    // 重新渲染整个掌握栏
    renderMasteredSentences();

    saveProgress();
    updateStats();
}

// 添加到易错栏
function addToErrorSentences(sentence) {
    const errorDiv = document.getElementById('errorSentencesList');
    const sentenceItem = document.createElement('div');
    sentenceItem.className = 'error-item';

    // 创建删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = '删除该短句';

    // 添加删除事件
    deleteBtn.addEventListener('click', function () {
        deleteErrorSentence(sentence, sentenceItem);
    });

    // 设置内容和按钮
    sentenceItem.textContent = sentence;
    sentenceItem.appendChild(deleteBtn);

    errorDiv.appendChild(sentenceItem);
}

// 从易错栏移除
function removeFromErrorSentences(sentence) {
    errorSentences.delete(sentence);

    // 从DOM中删除
    const errorDiv = document.getElementById('errorSentencesList');
    const items = errorDiv.querySelectorAll('.error-item');
    items.forEach(item => {
        if (item.textContent.replace('×', '').trim() === sentence.trim()) {
            item.remove();
        }
    });
}

// 删除易错短句
function deleteErrorSentence(sentence, element) {
    // 从集合中删除
    errorSentences.delete(sentence);

    // 从DOM中删除
    element.remove();

    saveProgress();
    updateStats();
}

// 显示错误统计
function displayErrorStats() {
    const statsDiv = document.getElementById('errorStatsList');
    statsDiv.innerHTML = '';

    // 按错误次数排序
    const sortedErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1]);

    sortedErrors.forEach(([sentence, count]) => {
        const statItem = document.createElement('div');
        statItem.className = 'error-stat-item';
        statItem.textContent = `${sentence}: ${count}次`;
        statsDiv.appendChild(statItem);
    });
}

// 清除错误统计
function clearErrorStats() {
    // 清空错误次数统计
    errorCounts.clear();

    // 清空易错短句
    errorSentences.clear();

    // 清空易错栏显示
    const errorSentencesList = document.getElementById('errorSentencesList');
    errorSentencesList.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">暂无易错短句</div>';

    // 清空错误统计显示
    displayErrorStats();

    // 保存进度
    saveProgress();

    // 更新统计显示
    updateStats();
}

// 更新统计信息
function updateStats() {
    const totalArticles = allArticles.length;
    const total = allSentences.length;
    const mastered = masteredSentences.size;
    const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

    document.getElementById('totalArticles').textContent = totalArticles;
    document.getElementById('totalSentences').textContent = total;
    document.getElementById('masteredCount').textContent = mastered;
    document.getElementById('accuracy').textContent = `${percentage}%`;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `学习进度: ${percentage}%`;
}

// 更新导航
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const navInfo = document.getElementById('articleNavInfo');

    const total = allArticles.length;
    const current = currentArticleIndex + 1;

    navInfo.textContent = `第 ${current} 篇 / 共 ${total} 篇`;
    prevBtn.disabled = currentArticleIndex === 0;
    nextBtn.disabled = currentArticleIndex >= total - 1;
}

// 上一篇
function showPreviousArticle() {
    if (currentArticleIndex > 0) {
        currentArticleIndex--;
        generateArticleCloze(currentArticleIndex);
        updateNavigation();
        // 重新渲染掌握栏，实现当前篇置顶
        renderMasteredSentences();
    }
}

// 下一篇
function showNextArticle() {
    if (currentArticleIndex < allArticles.length - 1) {
        currentArticleIndex++;
        generateArticleCloze(currentArticleIndex);
        updateNavigation();
        // 重新渲染掌握栏，实现当前篇置顶
        renderMasteredSentences();
    }
}

// 保存学习进度
function saveProgress() {
    const progress = {
        masteredSentences: Array.from(masteredSentences),
        errorSentences: Array.from(errorSentences),
        errorCounts: Object.fromEntries(errorCounts),
        timestamp: Date.now()
    };
    localStorage.setItem('recitationProgress', JSON.stringify(progress));
}

// 加载学习进度
function loadProgress() {
    const saved = localStorage.getItem('recitationProgress');
    if (saved) {
        const progress = JSON.parse(saved);
        masteredSentences = new Set(progress.masteredSentences || []);
        errorSentences = new Set(progress.errorSentences || []);
        errorCounts = new Map(Object.entries(progress.errorCounts || {}));

        // 渲染掌握栏
        renderMasteredSentences();

        // 显示易错短句
        errorSentences.forEach(sentence => {
            addToErrorSentences(sentence);
        });

        // 显示错误统计
        displayErrorStats();

        // 更新统计
        updateStats();
    }
}