CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dining_tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`outlet_id` integer NOT NULL,
	`number` text NOT NULL,
	`capacity` integer DEFAULT 4 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dining_tables_outlet_idx` ON `dining_tables` (`outlet_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`name` text NOT NULL,
	`category_name` text,
	`price` integer NOT NULL,
	`qty` integer NOT NULL,
	`note` text,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`outlet_id` integer NOT NULL,
	`type` text DEFAULT 'DINE_IN' NOT NULL,
	`table_id` integer,
	`table_number` text,
	`customer_name` text,
	`guests` integer,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`service` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`change_amount` integer DEFAULT 0 NOT NULL,
	`note` text,
	`cashier_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`paid_at` integer,
	`cancel_reason` text,
	`refunded_at` integer,
	`refunded_by_id` integer,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`table_id`) REFERENCES `dining_tables`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`refunded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_paid_at_idx` ON `orders` (`paid_at`);--> statement-breakpoint
CREATE INDEX `orders_outlet_idx` ON `orders` (`outlet_id`);--> statement-breakpoint
CREATE TABLE `outlets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`tax_percent` integer DEFAULT 0 NOT NULL,
	`service_percent` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`paper_width` integer DEFAULT 80 NOT NULL,
	`font_size` integer DEFAULT 12 NOT NULL,
	`receipt_header` text DEFAULT '' NOT NULL,
	`receipt_footer` text DEFAULT 'Terima kasih atas kunjungan Anda!' NOT NULL,
	`show_logo` integer DEFAULT true NOT NULL,
	`auto_print_receipt` integer DEFAULT true NOT NULL,
	`receipt_copies` integer DEFAULT 1 NOT NULL,
	`print_kitchen_ticket` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outlets_code_unique` ON `outlets` (`code`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category_id` integer,
	`price` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'Bakso Terbang' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'KASIR' NOT NULL,
	`outlet_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);