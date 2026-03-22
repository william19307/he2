-- 医疗转介记录（若已通过 `prisma db push` 建表，部署时可跳过或手动标记为已应用）
CREATE TABLE IF NOT EXISTS `medical_referrals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `counselor_id` BIGINT NOT NULL COMMENT '经办心理老师',
    `referral_date` DATE NOT NULL COMMENT '转介日期',
    `institution` VARCHAR(200) NOT NULL COMMENT '转介机构',
    `reason` TEXT NOT NULL COMMENT '转介原因',
    `parent_informed` TINYINT NOT NULL DEFAULT 0 COMMENT '家长是否知情',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending|completed|cancelled',
    `follow_up_note` TEXT NULL COMMENT '后续跟进备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_tenant_student` (`tenant_id`, `student_id`),
    INDEX `idx_status` (`status`),
    INDEX `medical_referrals_student_id_fkey` (`student_id`),
    INDEX `medical_referrals_counselor_id_fkey` (`counselor_id`),
    CONSTRAINT `medical_referrals_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `medical_referrals_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `medical_referrals_counselor_id_fkey` FOREIGN KEY (`counselor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) COMMENT '医疗转介记录';
