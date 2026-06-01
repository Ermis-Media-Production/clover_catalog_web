CREATE TABLE `clover_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloverId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_categories_cloverId_unique` UNIQUE(`cloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_item_categories` (
	`itemCloverId` varchar(64) NOT NULL,
	`categoryCloverId` varchar(64) NOT NULL,
	CONSTRAINT `clover_item_categories_itemCloverId_categoryCloverId_pk` PRIMARY KEY(`itemCloverId`,`categoryCloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_item_modifier_groups` (
	`itemCloverId` varchar(64) NOT NULL,
	`modifierGroupCloverId` varchar(64) NOT NULL,
	CONSTRAINT `clover_item_modifier_groups_itemCloverId_modifierGroupCloverId_pk` PRIMARY KEY(`itemCloverId`,`modifierGroupCloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_item_tags` (
	`itemCloverId` varchar(64) NOT NULL,
	`tagCloverId` varchar(64) NOT NULL,
	CONSTRAINT `clover_item_tags_itemCloverId_tagCloverId_pk` PRIMARY KEY(`itemCloverId`,`tagCloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloverId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` bigint DEFAULT 0,
	`cost` bigint DEFAULT 0,
	`description` text,
	`sku` varchar(128),
	`hidden` boolean DEFAULT false,
	`available` boolean DEFAULT true,
	`stockCount` int,
	`imageUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_items_cloverId_unique` UNIQUE(`cloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_modifier_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloverId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`minRequired` int DEFAULT 0,
	`maxAllowed` int DEFAULT 0,
	`showByDefault` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_modifier_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_modifier_groups_cloverId_unique` UNIQUE(`cloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloverId` varchar(64) NOT NULL,
	`modifierGroupId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` bigint DEFAULT 0,
	`available` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_modifiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_modifiers_cloverId_unique` UNIQUE(`cloverId`)
);
--> statement-breakpoint
CREATE TABLE `clover_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cloverId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`showInReporting` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clover_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `clover_tags_cloverId_unique` UNIQUE(`cloverId`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`status` enum('running','success','error') NOT NULL DEFAULT 'running',
	`itemsSynced` int DEFAULT 0,
	`categoriesSynced` int DEFAULT 0,
	`tagsSynced` int DEFAULT 0,
	`modifiersSynced` int DEFAULT 0,
	`errorMessage` text,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
