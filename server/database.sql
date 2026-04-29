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

-- ============================================
-- RAG 知识库相关表
-- ============================================

-- 知识库表
CREATE TABLE IF NOT EXISTS `knowledge_bases` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '知识库 ID',
  `user_id` INT NOT NULL COMMENT '所属用户 ID',
  `name` VARCHAR(200) NOT NULL COMMENT '知识库名称',
  `description` TEXT NULL COMMENT '知识库描述',
  `lancedb_table_name` VARCHAR(100) NOT NULL COMMENT 'LanceDB 表名（内部标识）',
  `document_count` INT DEFAULT 0 COMMENT '文档数量',
  `chunk_count` INT DEFAULT 0 COMMENT '分块总数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_kb_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库表';

-- 知识库文档表
CREATE TABLE IF NOT EXISTS `kb_documents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '文档 ID',
  `kb_id` INT NOT NULL COMMENT '所属知识库 ID',
  `filename` VARCHAR(500) NOT NULL COMMENT '原始文件名',
  `file_path` VARCHAR(1000) NOT NULL COMMENT '文件存储路径',
  `file_type` VARCHAR(100) NOT NULL COMMENT 'MIME 类型',
  `file_size` INT NOT NULL COMMENT '文件大小（字节）',
  `chunk_count` INT DEFAULT 0 COMMENT '分块数量',
  `status` ENUM('pending','processing','completed','failed') DEFAULT 'pending' COMMENT '处理状态',
  `error_message` TEXT NULL COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (`kb_id`) REFERENCES `knowledge_bases`(`id`) ON DELETE CASCADE,
  INDEX `idx_kb_doc_kb_id` (`kb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库文档表';

-- 知识库文档分块表（元数据索引，向量存储在 LanceDB 中）
CREATE TABLE IF NOT EXISTS `kb_chunks` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '分块 ID',
  `doc_id` INT NOT NULL COMMENT '所属文档 ID',
  `kb_id` INT NOT NULL COMMENT '所属知识库 ID',
  `chunk_index` INT NOT NULL COMMENT '分块序号',
  `content_preview` VARCHAR(500) NULL COMMENT '分块内容预览（前500字符）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (`doc_id`) REFERENCES `kb_documents`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`kb_id`) REFERENCES `knowledge_bases`(`id`) ON DELETE CASCADE,
  INDEX `idx_kb_chunk_doc_id` (`doc_id`),
  INDEX `idx_kb_chunk_kb_id` (`kb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库分块表';

-- chat_history 新增 RAG 字段（如果表已存在）
-- ALTER TABLE chat_history ADD COLUMN `kb_id` INT NULL COMMENT '关联的知识库 ID' AFTER `files`;
-- ALTER TABLE chat_history ADD COLUMN `retrieved_chunks` JSON NULL COMMENT '检索到的分块摘要' AFTER `kb_id`;

-- 示例数据（可选，用于测试）
-- INSERT INTO users (username, email, password, role) VALUES 
-- ('admin', 'admin@example.com', '$2a$10$example_hashed_password', 'admin'),
-- ('test', 'test@example.com', '$2a$10$example_hashed_password', 'user');
