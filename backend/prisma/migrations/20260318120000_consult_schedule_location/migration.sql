ALTER TABLE `consult_schedules`
  ADD COLUMN `location` VARCHAR(100) NULL AFTER `max_slots`,
  ADD COLUMN `effective_from` DATE NULL AFTER `location`,
  ADD COLUMN `effective_until` DATE NULL AFTER `effective_from`;
