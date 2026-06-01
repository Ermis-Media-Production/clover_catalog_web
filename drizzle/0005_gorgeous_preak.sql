CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` varchar(255),
	`discountType` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
	`discountValue` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
