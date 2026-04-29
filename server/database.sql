-- ============================================
-- 数据库表结构创建脚本
-- ============================================
-- 说明：在 MySQL 数据库中执行此脚本创建用户表
-- 使用方法：mysql -u root -p your_database_name < database.sql
-- ============================================

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户 ID',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密后）',
  `role` ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色：admin 管理员，user 普通用户',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建对话历史表
CREATE TABLE IF NOT EXISTS `chat_history` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '对话历史 ID',
  `session_id` VARCHAR(100) NOT NULL COMMENT '会话 ID',
  `user_id` INT NULL COMMENT '用户 ID（可为空，表示未登录用户）',
  `role` ENUM('user', 'assistant') NOT NULL COMMENT '角色：user 用户，assistant 助手',
  `content` TEXT NOT NULL COMMENT '对话内容',
  `files` JSON NULL COMMENT '附件列表 [{name, url, type}]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话历史表';

-- 如果表已存在，执行以下语句添加 files 列
-- ALTER TABLE chat_history ADD COLUMN `files` JSON NULL COMMENT '附件列表' AFTER `content`;

-- 示例数据（可选，用于测试）
-- INSERT INTO users (username, email, password, role) VALUES 
-- ('admin', 'admin@example.com', '$2a$10$example_hashed_password', 'admin'),
-- ('test', 'test@example.com', '$2a$10$example_hashed_password', 'user');
