CREATE TABLE `appointments` (
	`id` char(36) NOT NULL,
	`patient_id` char(36) NOT NULL,
	`doctor_id` char(36) NOT NULL,
	`clinic_id` char(36) NOT NULL,
	`specialty_id` char(36) NOT NULL,
	`date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`status` enum('scheduled','confirmed','completed','canceled','no_show') NOT NULL DEFAULT 'scheduled',
	`cancel_reason` varchar(500),
	`created_by_user_id` char(36) NOT NULL,
	`canceled_by_user_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinic_admins` (
	`id` char(36) NOT NULL,
	`clinic_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`corporate_name` varchar(255),
	`document` varchar(50),
	`phone` varchar(20),
	`email` varchar(255),
	`address` varchar(255),
	`city` varchar(100),
	`state` varchar(50),
	`zip_code` varchar(20),
	`active` boolean NOT NULL DEFAULT true,
	`created_by_user_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinics_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinics_document_unique` UNIQUE(`document`)
);
--> statement-breakpoint
CREATE TABLE `doctor_availabilities` (
	`id` char(36) NOT NULL,
	`doctor_id` char(36) NOT NULL,
	`clinic_id` char(36) NOT NULL,
	`weekday` int NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`slot_duration_minutes` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_availabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_clinics` (
	`id` char(36) NOT NULL,
	`doctor_id` char(36) NOT NULL,
	`clinic_id` char(36) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_clinics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`crm` varchar(50) NOT NULL,
	`bio` varchar(1000),
	`avatar_url` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `doctors_crm_unique` UNIQUE(`crm`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` varchar(1000) NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`phone` varchar(20),
	`birth_date` date,
	`document` varchar(50),
	`avatar_url` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `patients_document_unique` UNIQUE(`document`)
);
--> statement-breakpoint
CREATE TABLE `doctor_specialties` (
	`id` char(36) NOT NULL,
	`doctor_id` char(36) NOT NULL,
	`specialty_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_specialties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specialties` (
	`id` char(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`icon` varchar(100),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specialties_id` PRIMARY KEY(`id`),
	CONSTRAINT `specialties_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('patient','doctor','admin','super_admin') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clinic_id_clinics_id_fk` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_specialty_id_specialties_id_fk` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_canceled_by_user_id_users_id_fk` FOREIGN KEY (`canceled_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinic_admins` ADD CONSTRAINT `clinic_admins_clinic_id_clinics_id_fk` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinic_admins` ADD CONSTRAINT `clinic_admins_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinics` ADD CONSTRAINT `clinics_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_availabilities` ADD CONSTRAINT `doctor_availabilities_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_availabilities` ADD CONSTRAINT `doctor_availabilities_clinic_id_clinics_id_fk` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_clinics` ADD CONSTRAINT `doctor_clinics_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_clinics` ADD CONSTRAINT `doctor_clinics_clinic_id_clinics_id_fk` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_specialties` ADD CONSTRAINT `doctor_specialties_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_specialties` ADD CONSTRAINT `doctor_specialties_specialty_id_specialties_id_fk` FOREIGN KEY (`specialty_id`) REFERENCES `specialties`(`id`) ON DELETE restrict ON UPDATE no action;