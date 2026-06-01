ALTER TABLE `orders` ADD `couponCode` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `discountCents` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `orders` ADD `cloverOrderId` varchar(64);
