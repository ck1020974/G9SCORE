# 康橋G9模考分析介面設計

使用者是查閱學生、班級及歷年成績的教師。設計以閱讀數字、切換分析頁及比對圖表為優先，避免裝飾造成額外捲動。

## 本次使用的 skills

- frontend-design： https://github.com/anthropics/skills/tree/main/skills/frontend-design
- web-design-guidelines： https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- 檢查規則： https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md

## 設計基準

| 用途 | 色碼 |
| --- | --- |
| 頁面底色 | #f3f6fa |
| 報表面板 | #ffffff |
| 標題、表頭、選中導覽 | #142d4e |
| 次要文字 | #52657a |
| 操作與鍵盤焦點 | #2563eb |
| 細分隔線 | #d7e0eb |

採用 Noto Sans TC，數字使用等寬數字字形。面板與表格保持安靜，圖表的資料色彩作為主要視覺重點。

寬版左側導覽、右側報表；窄版導覽使用三欄兩排。保留個人表現的舊版成績表在上、兩張圖在下。寬螢幕的歷年分析採左圖右表，窄版上下排列。

## 可用性檢查與修正

- index.html：增加主要內容跳轉、圖表文字標籤、裝飾圖示隱藏、搜尋欄位名稱及字型來源預連線。
- app.js：導覽同步 aria-current；尊重減少動態效果的偏好。
- style.css：加入可見鍵盤焦點、44px導覽點擊範圍、表格等寬數字與淡色隔列；移除無目的的卡片移動及漸層背景。

這次不擴充資料統計功能或改變個人表現的桌面排列。

## 驗證

- 14項現有資料測試通過。
- 六個分析分頁可切換，導覽選中狀態一致。
- 375px窄版沒有頁面橫向溢出；分組篩選可更新人數與比例。
- 1440px寬版左圖右表，歷年統計表不需橫向捲動。
