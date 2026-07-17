SELECT
  json_extract(llmResult, '$.fiveLayers') AS topFiveLayers,
  json_extract(llmResult, '$.zhangbanshan_output.judgment') AS zbsJudgment,
  json_extract(llmResult, '$.zhangbanshan_output.five_layers') AS zbsFiveLayers
FROM ConsultRecord
WHERE id = '5587bd8e-a19d-4478-84eb-80febdcd9e53';
