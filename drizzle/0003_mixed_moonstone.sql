CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`itemCloverId` varchar(64) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`unitPriceCents` bigint NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`modifiersJson` text,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(32) NOT NULL,
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`totalCents` bigint NOT NULL,
	`customerFirstName` varchar(128) NOT NULL,
	`customerLastName` varchar(128) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(32),
	`authnetTransactionId` varchar(64),
	`authnetAuthCode` varchar(16),
	`paymentError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_reference_unique` UNIQUE(`reference`)
);
