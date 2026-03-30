-- Reject quiz games with empty or missing questions array
ALTER TABLE "GameGeneration"
  ADD CONSTRAINT chk_response_not_empty_content
  CHECK (
    -- responseJson must be a valid JSON object containing non-empty game content
    length("responseJson") > 20
    AND "responseJson"::jsonb -> 'game' IS NOT NULL
    AND (
      -- Quiz: must have at least 1 question
      ("gameType" != 'quiz')
      OR (jsonb_array_length(("responseJson"::jsonb -> 'game' -> 'questions')) >= 1)
    )
  );
