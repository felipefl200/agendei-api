CREATE TABLE `auth_revoked_tokens` (
	`token_hash` char(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_revoked_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
