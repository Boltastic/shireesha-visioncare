CREATE TABLE `availabilityRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availabilityRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blockedDates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`reason` varchar(180),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blockedDates_id` PRIMARY KEY(`id`),
	CONSTRAINT `blockedDates_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `slotHolds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotKey` varchar(80) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`serviceId` int NOT NULL,
	`expiresAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slotHolds_id` PRIMARY KEY(`id`),
	CONSTRAINT `slotHolds_slotKey_unique` UNIQUE(`slotKey`)
);
--> statement-breakpoint
CREATE INDEX `availability_day_idx` ON `availabilityRules` (`dayOfWeek`,`active`);--> statement-breakpoint
CREATE INDEX `slot_hold_expiry_idx` ON `slotHolds` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `slot_hold_phone_idx` ON `slotHolds` (`phone`);