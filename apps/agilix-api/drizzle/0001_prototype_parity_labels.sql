ALTER TABLE `iterations` ADD `date_range_label` text NOT NULL DEFAULT '06/02-06/13';
--> statement-breakpoint
ALTER TABLE `iterations` ADD `calendar_title` text NOT NULL DEFAULT '6 月 · Sprint 24 → 25';
--> statement-breakpoint
ALTER TABLE `iterations` ADD `calendar_weeks_json` text NOT NULL DEFAULT '[{"label":"W23","rangeLabel":"06/02-06/06 · S24","days":["2","3","4","5","6"]},{"label":"W24","rangeLabel":"06/09-06/13 · S24","days":["9","10","11","12","13"]},{"label":"W25","rangeLabel":"06/16-06/20 · S25","days":["16","17","18","19","20"]}]';
--> statement-breakpoint
ALTER TABLE `standups` ADD `weekday_label` text NOT NULL DEFAULT '星期五';
--> statement-breakpoint
ALTER TABLE `standups` ADD `calendar_label` text NOT NULL DEFAULT '每日 10:00';
--> statement-breakpoint
UPDATE `iterations` SET `date_range_label` = '06/02-06/13' WHERE `id` = 'search-s24';
--> statement-breakpoint
UPDATE `iterations` SET `calendar_title` = '6 月 · Sprint 24 → 25', `calendar_weeks_json` = '[{"label":"W23","rangeLabel":"06/02-06/06 · S24","days":["2","3","4","5","6"]},{"label":"W24","rangeLabel":"06/09-06/13 · S24","days":["9","10","11","12","13"]},{"label":"W25","rangeLabel":"06/16-06/20 · S25","days":["16","17","18","19","20"]}]' WHERE `id` = 'search-s24';
--> statement-breakpoint
UPDATE `iterations` SET `date_range_label` = '06/03-06/14', `calendar_title` = '6 月 · Sprint 12', `calendar_weeks_json` = '[{"label":"W1","rangeLabel":"当前周","days":["1","2","3","4","5"]},{"label":"W2","rangeLabel":"下周","days":["6","7","8","9","10"]}]' WHERE `id` = 'data-s12';
--> statement-breakpoint
UPDATE `iterations` SET `date_range_label` = '06/04-06/15', `calendar_title` = '6 月 · Sprint 07', `calendar_weeks_json` = '[{"label":"W1","rangeLabel":"当前周","days":["1","2","3","4","5"]},{"label":"W2","rangeLabel":"下周","days":["6","7","8","9","10"]}]' WHERE `id` = 'api-s07';
--> statement-breakpoint
UPDATE `iterations` SET `date_range_label` = '06/05-06/16', `calendar_title` = '6 月 · Sprint 19', `calendar_weeks_json` = '[{"label":"W1","rangeLabel":"当前周","days":["1","2","3","4","5"]},{"label":"W2","rangeLabel":"下周","days":["6","7","8","9","10"]}]' WHERE `id` = 'mobile-s19';
--> statement-breakpoint
UPDATE `standups` SET `date_label` = '06 / 06', `weekday_label` = '星期五', `calendar_label` = '每日 10:00' WHERE `id` = 'standup-search-today';
