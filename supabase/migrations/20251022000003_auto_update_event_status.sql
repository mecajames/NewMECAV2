-- Function to automatically update event status based on event_date
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine the appropriate status based on event_date
  IF NEW.event_date::date > CURRENT_DATE THEN
    NEW.status := 'upcoming';
  ELSIF NEW.event_date::date = CURRENT_DATE THEN
    NEW.status := 'ongoing';
  ELSE
    -- Only auto-update to completed if not manually set to cancelled
    IF NEW.status != 'cancelled' THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before INSERT or UPDATE on events table
DROP TRIGGER IF EXISTS trigger_update_event_status ON events;
CREATE TRIGGER trigger_update_event_status
  BEFORE INSERT OR UPDATE OF event_date
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_status();

-- Function to batch update existing event statuses (can be called manually or scheduled)
CREATE OR REPLACE FUNCTION batch_update_event_statuses()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  row_count INTEGER;
BEGIN
  -- Update upcoming events that are now in the past to completed
  UPDATE events
  SET status = 'completed'
  WHERE event_date::date < CURRENT_DATE
    AND status = 'upcoming';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  -- Update upcoming events that are today to ongoing
  UPDATE events
  SET status = 'ongoing'
  WHERE event_date::date = CURRENT_DATE
    AND status = 'upcoming';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  -- Update ongoing events that are now in the past to completed
  UPDATE events
  SET status = 'completed'
  WHERE event_date::date < CURRENT_DATE
    AND status = 'ongoing';

  GET DIAGNOSTICS row_count = ROW_COUNT;
  updated_count := updated_count + row_count;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the batch update to fix existing events
SELECT batch_update_event_statuses();

-- Create a comment explaining the automatic status updates
COMMENT ON FUNCTION update_event_status() IS
'Automatically updates event status based on event_date:
- upcoming: event_date is in the future
- ongoing: event_date is today
- completed: event_date is in the past (unless manually set to cancelled)
- cancelled: manually set, will not be auto-updated';

COMMENT ON FUNCTION batch_update_event_statuses() IS
'Batch updates all event statuses based on their event_date.
Can be run manually or scheduled via cron job.
Returns the number of events updated.';
