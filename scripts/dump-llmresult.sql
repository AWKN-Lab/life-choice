SELECT
  json_extract(llmResult, '$.fiveLayers') AS topFiveLayers,
  json_extract(llmResult, '$.zhangbanshan_output.judgment') AS zbsJudgment,
  json_extract(llmResult, '$.zhangbanshan_output.five_layers') AS zbsFiveLayers,
  json_extract(llmResult, '$.zhangbanshan_output.premise') AS zbsPremise,
  json_extract(llmResult, '$.zhangbanshan_output.reasoning_trace') AS zbsReason
FROM ConsultRecord
WHERE id = '59e85868-0511-4476-9b6b-095df51eb3f0';
