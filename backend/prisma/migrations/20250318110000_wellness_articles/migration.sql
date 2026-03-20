-- 自助调适内容库（gap-features 3.2）

CREATE TABLE `wellness_articles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT NULL COMMENT 'null=系统内容，有值=学校自建',
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `category_label` VARCHAR(20) NOT NULL,
  `content` LONGTEXT NOT NULL COMMENT 'Markdown格式',
  `cover_image` VARCHAR(500) NULL,
  `read_mins` INT NOT NULL DEFAULT 5,
  `is_published` TINYINT NOT NULL DEFAULT 1,
  `view_count` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `wellness_articles_category_is_published_idx` (`category`, `is_published`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
