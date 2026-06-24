# AI Topics Page Content Flow

> **Workspace:** d:\左宗林\1-小程序开发与IP孵化\SYZHZS

---

**User**

/store/ai-topics 这个页面，是怎么把所有的内容，串起来，发给ai的

**Assistant**

## `/store/ai-topics` 内容发送给 AI 的流程

### 1. 页面端：收集参数并请求

前端页面 (`page.tsx`) 收集以下信息：

**创作者身份**（从 `/api/store/creator-identity` 加载）：
- `contentTrack` - 内容赛道
- `personaStyle` - 人设风格
- `targetAudience` - 目标受众
- `videoTone` / `videoDuration` - 可选

**选题配置**（用户界面选择）：
- `accountStage` - 账号阶段（冷启动期/成长期/成熟期）
- `contentDirection` - 内容方向（教知识/聊观点/讲故事/晒过程）
- `decisionStage` - 用户决策阶段（选择困难/已决定/执行中）
- `topicCount` - 生成条数

调用 `POST /api/store/ai-topics` 发送这些参数。

---

### 2. API 端：组装 Prompt 并请求 AI

API 路由 (`/api/store/ai-topics/route.ts`) 处理流程：

**a) 获取创作者身份**
根据 `storeId` 从 `CreatorIdentity` 表查询身份信息

**b) 获取 AI 配置**
从 `AISettings` 表获取 `apiKey`、`baseUrl`、`modelId`

**c) 读取提示词模板**
调用 `getPromptByType('topic')` 从 `Prompt` 表获取 `type=topic` 的提示词

**d) 替换变量**
```typescript
const variables = {
  accountStage, contentDirection, decisionStage, topicCount,
  contentTrack: identity.contentTrack,
  personaStyle: identity.personaStyle,
  targetAudience: identity.targetAudience,
};
effectiveSystemPrompt = replacePromptVariables(topicPromptTemplate, variables);
```

**e) 构建用户 Prompt**
```typescript
const userPrompt = `请为以下创作者批量策划精准匹配的短视频选题：

## 创作者身份
- 内容赛道：${contentTrack}
- 人设风格：${personaStyle}
- 目标受众：${targetAudience}
...

## 选题需求
- 账号阶段：${accountStage}
- 内容方向：${contentDirection}
- 用户决策阶段：${decisionStage}
- 生成数量：${topicCount} 个`;
```

**f) 请求 AI**
```typescript
POST ${baseUrl}/chat/completions
{
  model: settings.modelId,
  messages: [
    { role: 'system', content: effectiveSystemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.8
}
```

---

### 3. 解析 AI 返回结果

`parseTopicsFromContent()` 尝试多种方式解析 AI 返回内容：
1. 从代码块提取 JSON
2. 直接匹配 JSON 数组
3. 逐行解析 `title`/`选题标题` 字段
4. 备用：按行号格式解析

---

### 4. 保存到选题库

用户点击"保存到文案库"时，调用 `POST /api/store/ai-scripts`，将选题标题、摘要、角度存入 `ScriptRecord` 表的 `corePoints` 字段。

---

**User**

构建用户Prompt是怎样的，因为我现在存有提示词目标那，但是感觉生成的选题，都比较干。没有我在本地操作的好

**Assistant**

让我看一下当前 topic 类型提示词的内容。


## 当前用户 Prompt 构建逻辑

当前 `buildUserPrompt` 构建的内容比较简单：

```
请为以下创作者批量策划精准匹配的短视频选题：

## 创作者身份
- 内容赛道：${contentTrack}
- 人设风格：${personaStyle}
- 目标受众：${targetAudience}
- 视频调性：${videoTone}（可选）
- 视频时长：${videoDuration}（可选）

## 选题需求
- 账号阶段：${accountStage}
- 内容方向：${contentDirection}
- 用户决策阶段：${decisionStage}
- 生成数量：${topicCount} 个
```

---

## 问题分析

**AI 生成的选题"干"的原因：**

1. **缺少具体内容框架指导** - 没有告诉 AI 选题应该包含什么（痛点、亮点、切入方式）
2. **缺少示例** - 没有 Few-shot（少样本提示），AI 不知道你期望的输出格式和风格
3. **缺少情感元素** - 只有冷冰冰的参数，没有场景化、情绪化的引导
4. **内容方向太笼统** - `contentDirection` 只传了"教知识/聊观点"等大类，没有细分

---

## 你本地操作的选题好在哪里？

你能分享一下你本地选题时是怎么思考的吗？比如：

1. **选题来源**：是根据什么灵感生成的？（热点、痛点、经历...）
2. **选题结构**：标题怎么起的？摘要怎么写？
3. **角度切入**：从哪个具体角度切入？

这样我可以帮你优化 Prompt，让 AI 生成更符合你期望的选题。

---

**User**

你现在只要告诉我，我在提示词库里面保存的选题类提示词，是否有正确使用

**Assistant**

根据代码分析，**提示词的使用逻辑是正确的**：

### 1. 提示词获取
```typescript
const topicPromptTemplate = await getPromptByType('topic');
```
✅ 从 Prompt 表按 `type='topic'` 查询，逻辑正确。

### 2. 变量替换
```typescript
const variables: Record<string, string> = {
  accountStage, contentDirection, decisionStage, topicCount,
  contentTrack, personaStyle, targetAudience,
};
effectiveSystemPrompt = replacePromptVariables(topicPromptTemplate, variables);
```
✅ 调用 `replacePromptVariables` 替换占位符，逻辑正确。

---

### 潜在问题

**variables 中定义的变量可能和你提示词里的占位符不匹配。**

代码只提供了 7 个变量：
- `{accountStage}`、`{contentDirection}`、`{decisionStage}`、`{topicCount}`
- `{contentTrack}`、`{personaStyle}`、`{targetAudience}`

如果你提示词里用了其他占位符（如 `{videoTone}`、`{videoDuration}`），**它们不会被替换**，会原样出现在发给 AI 的 prompt 中。

---

### 建议

你可以在 `/admin/prompts` 页面查看你保存的 `topic` 类型提示词，确认里面用到的占位符是否都在上述 7 个变量范围内。如果有缺失，告诉我具体缺什么，我帮你加上。

---

**User**

要不你加一个日志，我看日志调用的是什么

**Assistant**

已添加 3 个日志：

1. `[AI Topics] 原始提示词模板:` - 查看从数据库读取的提示词
2. `[AI Topics] 替换后的 System Prompt:` - 查看变量替换后的完整 system prompt
3. `[AI Topics] 构建的 User Prompt:` - 查看实际发送给 AI 的用户消息

现在你可以在终端或控制台中调用选题功能，查看实际发送的内容是否和你预期的一样。

---

**User**

`d:\左宗林\1-小程序开发与IP孵化\SYZHZS\1.md` 这是终端输出的日志，控制台没有任何反应

**Assistant**


从日志来看，**提示词本身没有使用错误**，变量都被正确替换了。

但问题在于 **System Prompt 和 User Prompt 内容重复**：

- **System Prompt**：你的详细提示词模板（很长，包含了账号信息、选题方向等）
- **User Prompt**：又重复了一遍账号信息和选题需求

这会导致：
1. **信息冗余** - AI 收到两份相似的指令
2. **指令冲突** - System Prompt 末尾说"直接返回JSON"，但 User Prompt 用"请为...策划"的请求语气，可能让 AI 先分析再返回

---

### 建议优化

`buildUserPrompt` 可以简化，只传递必要信息，不需要重复 System Prompt 已有的内容：


一个更好的做法是：**User Prompt 只保留简单指令**，让 System Prompt 专注规则。

例如把 `buildUserPrompt` 改成：

```typescript
const userPrompt = `请基于上述账号定位和选题需求，生成${topicCount}个精准匹配的短视频选题。`;
```

这样 AI 会：
- 从 System Prompt 获取详细的角色定义、选题模型、执行规则
- 从 User Prompt 获取具体的账号信息和生成指令

要我帮你修改 `buildUserPrompt` 函数吗？

---

**User**

需要

**Assistant**

已修改。现在 User Prompt 简化为：

```
请根据上述账号定位和选题需求，生成5个精准匹配的短视频选题。直接返回JSON数组，不要包含其他文字说明。
```

这样：
- **System Prompt** 负责提供详细的角色定义、选题模型、执行规则、账号信息
- **User Prompt** 只给出简洁的执行指令

你可以再测试一下看 AI 生成的结果是否有改善。

---

**User**

用户决策阶段可以设置为非必选项

**Assistant**

你是指在传给 AI 时，如果用户没有主动选择"用户决策阶段"，可以不传这个约束，让 AI 更自由地生成选题吗？

如果是的话，修改 variables 中 `decisionStage` 的默认值：


已将 `decisionStage` 默认值从 `'未知'` 改为 `'不限'`。

这样当用户没有主动选择"用户决策阶段"时，AI 会更自由地生成选题，而不是被限制在特定阶段。

---

**User**

现在有一个问题，就是我点击到了/store/ai-topics这个页面，它默认就会选中单元格，我需要用户自己点击，没有填写，就让它根据提示词自由发挥

**Assistant**

我来修改：1) 把默认值改成空字符串，2) 在每个选项组前面加一个"不限"选项。


现在需要更新 API 端，当用户没有选择时，传给 AI 的是"不限"而不是其他默认值。


已完成修改：

**前端页面 (page.tsx)**：
- 默认值改为空字符串
- 账号阶段、内容方向、用户决策阶段前面都加了"不限"选项（grid 列数相应增加）

**API 端 (route.ts)**：
- 空值时的默认值改为"不限"，让 AI 自由发挥

现在用户打开页面时不会默认选中任何选项，可以自由选择或直接点击生成让 AI 自由发挥。

---

**User**

账号阶段和内容方向可以不用设置不限，只需要设置用户决策阶段为不限

**Assistant**

已完成：
- 账号阶段：默认"冷启动期"，无"不限"选项
- 内容方向：默认"全部"，无"不限"选项  
- 用户决策阶段：默认空，有"不限"选项

---

**User**

你加一个ai思考的日志进去

**Assistant**

已添加 `[AI Topics] AI 原始回复:` 日志。

如果 AI 返回内容较长，日志可能会被截断。你可以先测试一下看效果。

---

**User**

部分模型会有思考部分，思考部分的日志，不能看到，对吗

**Assistant**

对的。部分模型（如 o1 系列）的"思考过程"是单独返回的，不在 `content` 字段里。

如果想看到思考日志，可以额外打印 `reasoning` 字段：


已添加思考日志，会尝试读取两种常见格式：
- `data.choices?.[0]?.message?.reasoning`（OpenAI o1 系列）
- `data.choices?.[0]?.reasoning`（部分国产模型）

现在测试时可以看到 AI 的思考过程了。

---

**User**

现在还有一个问题，就是有时候生成的选题是之前生成过，怎么区避免出现这种问题。

**Assistant**

有几种方案可以避免重复：

1. **本次会话去重** - 传入当前页面已显示的选题，让 AI 避免重复
2. **历史记录去重** - 从数据库查出该门店之前生成过的选题，让 AI 避开

你想用哪种方式？或者两种都要？

---

**User**

历史记录去重，但是这样的话，会不会让token浪费太多，或者ai降智

**Assistant**

这个担心有道理。解决思路是：**只传历史选题的标题列表**（很简短），不传详细内容。

这样：
- Token 消耗极少
- AI 只需要"避开这些标题"
- 仍然能自由发挥生成新内容

要实现吗？大概方案是：

1. 从 `ScriptRecord` 表查出该门店最近的 20-50 条选题标题
2. 传给 AI 时加一句：`已生成过的选题标题（请勿重复）：xxx、xxx、xxx`
3. 让 AI 自己判断避开

---

**User**

需要实现

**Assistant**

已完成历史记录去重功能：

1. **查询历史选题** - 从 `ScriptRecord` 表最多取 50 条该门店的选题标题
2. **传递给 AI** - User Prompt 末尾附加去重提示，最多显示 30 条
3. **Token 节省** - 只传标题列表，不传详细内容

日志输出会显示历史选题数量，User Prompt 会包含类似：
```
【重要】以下选题标题已生成过，请勿重复：
标题1、标题2、标题3...
```

你可以测试一下看效果。

---

**User**

/store/ai-content 这个页面也添加一个日志，让我看一下怎么调用的，类似这个已添加 3 个日志： 
 
 1. [AI Topics] 原始提示词模板: - 查看从数据库读取的提示词 
 2. [AI Topics] 替换后的 System Prompt: - 查看变量替换后的完整 system prompt 
 3. [AI Topics] 构建的 User Prompt: - 查看实际发送给 AI 的用户消息

**Assistant**

已添加 4 个日志到 `/api/store/ai-content/generate-script`：

1. `[AI Content] 原始模板 Prompt:` - 查看从模板读取的原始提示词
2. `[AI Content] 替换后的 System Prompt:` - 查看变量替换后的完整 system prompt
3. `[AI Content] 构建的 User Prompt:` - 查看实际发送给 AI 的用户消息
4. `[AI Content] AI 思考过程:` + `[AI Content] AI 原始回复:` - 查看 AI 思考和回复

测试一下应该就能在终端看到日志了。

---

**User**

[AI Content] 构建的 User Prompt: - 查看实际发送给 AI 的用户消息 这一个，还是多发了，[AI Content] 构建的 User Prompt: 请基于以下选题信息创作短视频脚本： 
 
 选题标题：别啥不舒服都赖更年期！月经乱不背这个锅 
 内容摘要：吐槽很多姐妹把失眠、发胖、脾气差全归因为更年期月经紊乱的错误逻辑，点出真正的诱因，教你别瞎调理不对症白受罪。 
 切入角度：属于聊观点方向的对立型观点，明确反对“更年期是万能背锅侠”的普遍想法，犀利吐槽大家乱找原因、乱调月经的糊涂做法，帮用户精准戳破认知误区，记忆点极强。 
 补充说明：无 
 ，看一下会不会冲突

**Assistant**

确实会有重复。信息已经在 System Prompt 的变量替换中传了（`{topic}`、`{summary}`、`{angle}`、`{supplementary}` 已被替换），User Prompt 又重复了一遍。

两种处理方式：

1. **简化 User Prompt** - 只保留指令，不重复信息
2. **保留双重保险** - 有时候重复强调效果更好，但可能让 AI 行为不稳定

建议先简化试试，看 AI 生成效果是否有改善。要我改吗？

---

**User**

简化User Prompt - 只保留指令，不重复信息

**Assistant**


已简化：

- **original 类型**：简化为"请根据上述选题信息，创作高质量的短视频脚本。"
- **rewrite 类型**：保留原文内容（因为原文信息不在 system prompt 里）

你可以测试一下看效果。

---

**User**

如果直接删除User Prompt ，会出现什么结果

**Assistant**

如果删除 User Prompt，messages 就只剩 System Prompt 一个消息。

**可能的结果：**

**好的方面：**
- 更简洁，Token 消耗更少
- 不会有信息重复或指令冲突
- System Prompt 里的变量替换后已包含所有选题信息

**潜在风险：**
- 极少数模型对"只有 system 消息"响应不佳（但主流模型基本都支持）
- 没有 user prompt 做引导，AI 可能自说自话

**建议：**
可以先测试，如果 AI 生成的内容正常，就保持这样。如果有问题再改回来。

要我直接删掉试试吗？

---

**User**

你删除试试

**Assistant**

已删除 User Prompt，现在只发 System Prompt。你可以测试看效果。

---

**User**

/store/ai-content 你是不是删除错了，这个页面，生成区好像没有正确渲染，显示的是原格式

**Assistant**

让我检查一下页面的渲染逻辑和返回内容的处理。


让我先恢复 User Prompt，但简化它，只保留 JSON 输出指令：


已添加"并直接返回JSON格式"到 User Prompt。你测试一下看 AI 返回的内容是否还是原格式，以及终端日志显示的 AI 回复是什么。

---

**User**

还是没有正确渲染json格式，你应该检查，生成区是怎么渲染的

**Assistant**

渲染逻辑我看到了 - `renderScriptContent` 会尝试解析 JSON，成功就按字段渲染，失败就显示纯文本。

"显示原格式"说明 AI 返回的内容 JSON 解析失败了。你能看一下终端日志 `[AI Content] AI 原始回复:` 里面 AI 返回的是什么格式吗？这样我才能确定问题是 AI 返回格式变了，还是字段名不匹配。

---

**User**

Terminal#952-1013

**Assistant**

看到问题了！AI 返回的是 ` ````json`（4个反引号），但解析代码只处理 ` ```json`（3个反引号）。

需要修改解析逻辑，让它能处理 3 个或更多反引号：


已修改，将 ` ```\n?` 改为 ` ```+\n?`，现在可以处理 3 个或更多反引号了。再测试一下应该能正确渲染 JSON 了。

---
