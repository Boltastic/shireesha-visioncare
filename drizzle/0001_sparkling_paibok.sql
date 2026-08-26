CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` varchar(40) NOT NULL,
	`patientId` int NOT NULL,
	`serviceId` int NOT NULL,
	`startTime` datetime NOT NULL,
	`endTime` datetime NOT NULL,
	`slotKey` varchar(80) NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'confirmed',
	`reason` text,
	`calendarEventId` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_bookingId_unique` UNIQUE(`bookingId`),
	CONSTRAINT `appointments_slotKey_unique` UNIQUE(`slotKey`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(40) NOT NULL,
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookingAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(32) NOT NULL,
	`phone` varchar(20),
	`ipHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otpChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`provider` varchar(20) NOT NULL,
	`codeHash` varchar(64),
	`verificationTokenHash` varchar(64),
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` datetime NOT NULL,
	`resendAfter` datetime NOT NULL,
	`verifiedAt` datetime,
	`consumedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otpChallenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(120) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`phoneVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`value` varchar(500) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE INDEX `appointments_patient_idx` ON `appointments` (`patientId`);--> statement-breakpoint
CREATE INDEX `appointments_start_idx` ON `appointments` (`startTime`);--> statement-breakpoint
CREATE INDEX `audit_admin_idx` ON `auditLogs` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attempt_kind_phone_idx` ON `bookingAttempts` (`kind`,`phone`,`createdAt`);--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otpChallenges` (`phone`);--> statement-breakpoint
CREATE INDEX `otp_expiry_idx` ON `otpChallenges` (`expiresAt`);