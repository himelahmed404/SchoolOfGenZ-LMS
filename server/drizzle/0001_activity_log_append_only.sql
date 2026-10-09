-- The activity log can only be added to. Nobody, including the application, can rewrite what staff did.
CREATE FUNCTION activity_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'activity_log can only be added to';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER activity_log_no_change
  BEFORE UPDATE OR DELETE ON "activity_log"
  FOR EACH ROW EXECUTE FUNCTION activity_log_append_only();
