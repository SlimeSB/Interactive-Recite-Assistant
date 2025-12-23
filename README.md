# 背诵软件

一个基于HTML、CSS和JavaScript开发的背诵学习软件，支持题库加载、智能挖空、学习进度跟踪和个性化配置。

## 功能特点

- 📚 **题库支持**：自动加载指定的文本题库文件
- 🎯 **智能挖空**：根据文章长度动态调整挖空数量
- 📊 **学习进度**：实时跟踪学习进度和掌握情况
- 📝 **掌握机制**：区分易错项和已掌握项
- 🔄 **复习模式**：已掌握文章自动进入复习模式
- 🎨 **可定制**：通过配置文件调整软件行为
- 📱 **响应式设计**：适配不同屏幕尺寸

## 快速开始

1. **启动本地服务器**
   ```bash
   # 使用 Python 启动简单 HTTP 服务器
   python -m http.server 8080
   
   # 或使用其他 HTTP 服务器
   # npm install -g http-server
   # http-server -p 8080
   ```

2. **访问应用**
   在浏览器中访问 `http://localhost:8080`

3. **开始学习**
   - 系统自动加载题库并生成题目
   - 在输入框中填写答案，失去焦点后自动检查
   - 查看右侧的掌握栏和易错栏
   - 使用导航按钮切换文章

## 配置说明

软件通过 `config.json` 文件进行配置，支持以下配置项：

### 配置文件结构

```json
{
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
}
```

### 配置项详细说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| questionFile | string | 背诵.txt | 题库文件名，必须放在应用根目录下 |
| clozeConfig.minCount | number | 1 | 最小挖空数量，确保每个文章至少有一个挖空 |
| clozeConfig.smallArticleRatio | number | 0.3 | 小文章的挖空比例，按词条数量的百分比计算 |
| clozeConfig.largeArticleMin | number | 3 | 大文章的最小挖空数量 |
| clozeConfig.largeArticleMax | number | 5 | 大文章的最大挖空数量 |
| clozeConfig.smallArticleThreshold | number | 10 | 小文章的词条数量阈值，低于此值的文章视为小文章 |
| reviewConfig.reviewClozeCount | number | 1 | 复习模式下的挖空数量 |
| uiConfig.errorSectionDefaultCollapsed | boolean | true | 易错栏默认是否折叠 |

### 配置示例

```json
{
    "questionFile": "我的题库.txt",
    "clozeConfig": {
        "minCount": 2,
        "smallArticleRatio": 0.4,
        "largeArticleMin": 4,
        "largeArticleMax": 6,
        "smallArticleThreshold": 15
    },
    "reviewConfig": {
        "reviewClozeCount": 2
    },
    "uiConfig": {
        "errorSectionDefaultCollapsed": false
    }
}
```

## 文件结构

```
.
├── index.html          # 主页面文件
├── script.js           # JavaScript 逻辑
├── config.json         # 配置文件
├── 背诵.txt           # 题库文件
└── README.md          # 说明文档
```

## 技术实现

### 核心技术
- **HTML5**：页面结构和语义化标签
- **CSS3**：样式设计和响应式布局
- **JavaScript (ES6+)**：交互逻辑和数据处理
- **LocalStorage**：本地存储学习进度

### 主要功能模块

1. **题库加载模块**：读取和解析文本题库
2. **挖空生成模块**：智能生成挖空题目
3. **答案检查模块**：实时检查答案并提供反馈
4. **进度跟踪模块**：记录和更新学习进度
5. **UI交互模块**：处理用户界面交互
6. **配置管理模块**：加载和应用配置

## 使用说明

### 题库格式

题库文件（如 `背诵.txt`）采用以下格式：
- 每行为一篇独立文章
- 支持行号前缀（如 "1→"），可选
- 空行自动忽略

示例：
```
1→温邪上受，首先犯肺，逆传心包。肺主气属卫，心主血属营，辨营卫气血虽与伤寒同，若论治法则与伤寒大异也。
2→盖伤寒之邪留恋在表，然后化热入里，温邪则热变最速。未传心包，邪尚在肺，肺主气，其合皮毛，故云在表。
```

### 学习流程

1. **加载题库**：系统自动加载配置中指定的题库文件
2. **生成题目**：根据配置生成带挖空的文章
3. **填写答案**：在输入框中填写答案
4. **检查答案**：失去焦点后自动检查，显示反馈
5. **掌握机制**：
   - 首次正确：从易错栏移除
   - 不在易错栏时正确：添加到掌握栏
   - 错误：添加到易错栏并更新错误次数
6. **导航切换**：使用上一篇/下一篇按钮切换文章
7. **复习模式**：文章全部掌握后自动进入复习模式

### 界面说明

- **掌握栏**：显示已掌握的短句
- **易错栏**：可折叠，显示易错短句和错误次数统计
- **学习统计**：显示总文章数、总短句数、已掌握数和正确率
- **进度条**：直观显示学习进度

## 自定义开发

### 修改样式

修改 `index.html` 中的 CSS 样式部分，可以自定义界面外观：
- 颜色主题
- 字体大小
- 布局结构
- 动画效果

### 扩展功能

修改 `script.js` 文件，可以扩展软件功能：
- 添加新的挖空算法
- 集成其他题库格式
- 添加导出/导入功能
- 实现云同步

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 许可证

MIT License

## 作者

Trae AI

## 更新日志

### v1.0.0 (2025-12-23)
- 初始版本发布
- 支持题库加载和智能挖空
- 实现学习进度跟踪
- 支持个性化配置
- 实现复习模式
- 支持易错项管理

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。