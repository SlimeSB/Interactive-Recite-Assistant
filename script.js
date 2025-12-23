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
document.addEventListener('DOMContentLoaded', function() {
    // 加载配置
    loadConfig()
        .then(() => {
            // 从本地存储加载学习进度
            loadProgress();
            
            // 自动加载题库
            loadTextFile();
            
            // 绑定事件
            document.getElementById('loadBtn').addEventListener('click', loadTextFile);
            document.getElementById('generateBtn').addEventListener('click', generateClozeTest);
            document.getElementById('prevBtn').addEventListener('click', showPreviousArticle);
            document.getElementById('nextBtn').addEventListener('click', showNextArticle);
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
            document.getElementById('loadBtn').addEventListener('click', loadTextFile);
            document.getElementById('generateBtn').addEventListener('click', generateClozeTest);
            document.getElementById('prevBtn').addEventListener('click', showPreviousArticle);
            document.getElementById('nextBtn').addEventListener('click', showNextArticle);
        });
});

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

// 生成单篇文章的填空题
function generateArticleCloze(articleIndex) {
    const article = allArticles[articleIndex];
    if (!article) return;
    
    // 将文章内容按标点符号分割
    const parts = article.content.split(/([，。；！？：])/).filter(Boolean);
    
    // 获取当前文章的所有短句
    const allArticleSentences = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) {
            const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
            allArticleSentences.push(sentence);
        }
    }
    
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
        const allPositions = [];
        for (let i = 0; i < parts.length; i += 2) {
            if (parts[i] && parts[i].trim()) {
                allPositions.push(i);
            }
        }
        
        while (clozePositions.length < clozeCount && allPositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * allPositions.length);
            clozePositions.push(allPositions[randomIndex]);
            allPositions.splice(randomIndex, 1);
        }
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
        
        // 随机选择挖空位置
        while (clozePositions.length < clozeCount && availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            clozePositions.push(availablePositions[randomIndex]);
            availablePositions.splice(randomIndex, 1);
        }
        
        // 如果没有足够的可挖空位置，从所有位置中补充
        if (clozePositions.length < clozeCount) {
            const allPositions = [];
            for (let i = 0; i < parts.length; i += 2) {
                if (parts[i] && parts[i].trim()) {
                    allPositions.push(i);
                }
            }
            
            // 过滤掉已选位置
            const remainingPositions = allPositions.filter(pos => !clozePositions.includes(pos));
            
            // 补充选择
            while (clozePositions.length < clozeCount && remainingPositions.length > 0) {
                const randomIndex = Math.floor(Math.random() * remainingPositions.length);
                clozePositions.push(remainingPositions[randomIndex]);
                remainingPositions.splice(randomIndex, 1);
            }
        }
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
    const allArticleSentences = [];
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i].trim()) {
            const sentence = article.lineNumber + parts[i] + (parts[i + 1] || '');
            allArticleSentences.push(sentence);
        }
    }
    
    const allMastered = allArticleSentences.every(sentence => masteredSentences.has(sentence));
    
    // 添加文章标题，包括已全部背诵标记
    let articleInfo = `${article.lineNumber}篇`;
    if (allMastered) {
        articleInfo += ` <span style="color: #4CAF50; font-weight: bold;">(已全部背诵)</span>`;
    }
    
    let html = `<div class="article-info">${articleInfo}</div>`;
    
    parts.forEach((part, i) => {
        if (clozePositions.includes(i) && part.trim()) {
            // 挖空部分
            const originalText = part;
            const sentence = article.lineNumber + part + (parts[i + 1] || '');
            const inputId = `cloze-${currentArticleIndex}-${i}`;
            const feedbackId = `feedback-${currentArticleIndex}-${i}`;
            
            html += `
                <div class="input-group">
                    <input type="text" id="${inputId}" class="cloze-input" placeholder="请输入..." 
                           data-original="${originalText}" data-sentence="${sentence}">
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
        feedbackElement.textContent = `✓`;
        feedbackElement.className = 'answer-feedback correct';
        
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
        
        saveProgress();
        updateStats();
    } else {
        // 错误
        input.classList.add('incorrect');
        input.classList.remove('correct');
        feedbackElement.textContent = `✗ 正确答案: ${originalText}`;
        
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
        
        saveProgress();
        updateStats();
    }
}

// 添加到掌握栏
function addToMasteredSentences(sentence) {
    const masteredDiv = document.getElementById('masteredSentencesList');
    const sentenceItem = document.createElement('div');
    sentenceItem.className = 'mastered-item';
    
    // 创建删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = '删除该短句';
    
    // 添加删除事件
    deleteBtn.addEventListener('click', function() {
        deleteMasteredSentence(sentence, sentenceItem);
    });
    
    // 设置内容和按钮
    sentenceItem.textContent = sentence;
    sentenceItem.appendChild(deleteBtn);
    
    masteredDiv.appendChild(sentenceItem);
}

// 删除已掌握的短句
function deleteMasteredSentence(sentence, element) {
    // 从集合中删除
    masteredSentences.delete(sentence);
    
    // 从DOM中删除
    element.remove();
    
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
    deleteBtn.addEventListener('click', function() {
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
    }
}

// 下一篇
function showNextArticle() {
    if (currentArticleIndex < allArticles.length - 1) {
        currentArticleIndex++;
        generateArticleCloze(currentArticleIndex);
        updateNavigation();
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
        
        // 显示已掌握的短句
        masteredSentences.forEach(sentence => {
            addToMasteredSentences(sentence);
        });
        
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