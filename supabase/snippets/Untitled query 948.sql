SELECT ar.achieved_value, cr.score, ar.competition_result_id IS NULL AS cr_null, ad.name
  FROM achievement_recipients ar
  LEFT JOIN competition_results cr ON cr.id = ar.competition_result_id
  LEFT JOIN achievement_definitions ad ON ad.id = ar.achievement_id
  WHERE ad.name ILIKE '%Points Club%'
  LIMIT 10;