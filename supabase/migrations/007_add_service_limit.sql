-- Add max_services_per_day column to availability_settings table
ALTER TABLE availability_settings
ADD COLUMN max_services_per_day INTEGER DEFAULT NULL;

-- Add constraint to ensure value is positive if not null
ALTER TABLE availability_settings
ADD CONSTRAINT max_services_per_day_positive 
CHECK (max_services_per_day IS NULL OR max_services_per_day > 0);

-- Add comment for documentation
COMMENT ON COLUMN availability_settings.max_services_per_day IS 
'Maximum number of services allowed per day. NULL means unlimited.';
