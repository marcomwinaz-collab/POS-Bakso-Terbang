CREATE TABLE IF NOT EXISTS `cashier_shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outlet_id` integer NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`opening_cash` integer DEFAULT 0 NOT NULL,
	`opened_by_id` integer,
	`opened_at` integer NOT NULL,
	`closed_by_id` integer,
	`closed_at` integer,
	`expected_cash` integer,
	`counted_cash` integer,
	`note` text,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opened_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`closed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cashier_shifts_outlet_idx` ON `cashier_shifts` (`outlet_id`,`status`);