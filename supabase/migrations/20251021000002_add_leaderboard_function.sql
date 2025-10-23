-- Create get_leaderboard function for Top 10 leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  competitor_id UUID,
  competitor_name TEXT,
  total_points INTEGER,
  events_participated BIGINT,
  first_place BIGINT,
  second_place BIGINT,
  third_place BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cr.competitor_id, gen_random_uuid()) as competitor_id,
    cr.competitor_name,
    SUM(cr.points_earned)::INTEGER as total_points,
    COUNT(DISTINCT cr.event_id) as events_participated,
    COUNT(CASE WHEN cr.placement = 1 THEN 1 END) as first_place,
    COUNT(CASE WHEN cr.placement = 2 THEN 1 END) as second_place,
    COUNT(CASE WHEN cr.placement = 3 THEN 1 END) as third_place
  FROM competition_results cr
  WHERE cr.competitor_name IS NOT NULL
  GROUP BY
    cr.competitor_id,
    cr.competitor_name
  ORDER BY total_points DESC
  LIMIT 10;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard() TO anon, authenticated;
