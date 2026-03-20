-- 量表未配置计分规则时，默认按各题选项分累加（与 ScoreEngine method=sum 一致）
UPDATE `scales`
SET `scoring_rule` = JSON_OBJECT('method', 'sum')
WHERE `scoring_rule` IS NULL;
