---
description: Master Issueから次のIssueを作成します[/create-next-issue xxx]
allowed-tools: Write, Read, LS
---

# create-next-issue

## 目的
- Master Issueから次の子issueを作成
- 作成するIssueは @.claude/commands/issue-task-run.md で利用される

### タスクの調査 (Task Tool使用)
- @.claude/commands/issue-task-run.mdを参照し作成するissueがどのように使われるか確認
- github issue #$ARGUMENTS でMaster issue参照
- Master issue本文を読み込み、最初の未処理(`[ ]`)タスクを1件抽出
- タスク内容をよく考えて調査し実行計画を練る
   - 修正、追加が必要なファイルを明確に記載

### 子issueを作成
- gh コマンドで issue を作成し調査内容とタスクのチェックリストを作成
- 本文に含める要素:
   - 背景・目的
   - 詳細タスク（分解したチェックリスト）
   - 受入基準
   - テスト観点
   - 影響範囲 / リスク
   - 親Issueへのリンク（例: `Parent: #1`）

