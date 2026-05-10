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
  `email_verified` TINYINT(1) DEFAULT 0 COMMENT '邮箱是否已验证',
  `verification_token` VARCHAR(100) NULL COMMENT '邮箱验证令牌',
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
  `kb_id` INT NULL COMMENT '关联的知识库 ID',
  `retrieved_chunks` JSON NULL COMMENT '检索到的分块摘要 [{source, score}]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话历史表';

-- 如果表已存在，执行以下语句迁移
-- ALTER TABLE chat_history ADD COLUMN `files` JSON NULL COMMENT '附件列表' AFTER `content`;
-- ALTER TABLE chat_history ADD COLUMN `kb_id` INT NULL COMMENT '关联的知识库 ID' AFTER `files`;
-- ALTER TABLE chat_history ADD COLUMN `retrieved_chunks` JSON NULL COMMENT '检索到的分块摘要' AFTER `kb_id`;
-- ALTER TABLE users ADD COLUMN `email_verified` TINYINT(1) DEFAULT 0;
-- ALTER TABLE users ADD COLUMN `verification_token` VARCHAR(100) NULL;

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


-- ============================================
-- 系统配置表（API Key 等）
-- ============================================

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `key_name` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键名',
  `value` TEXT NOT NULL COMMENT '配置值',
  `description` VARCHAR(255) DEFAULT '' COMMENT '配置说明',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表（API Key等）';


-- 验证码临时存储表
CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT '已加密密码',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vc_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='注册验证码临时存储（验证通过后移至users表）';

-- ============================================
-- AI 角色扮演智能体表
-- ============================================

CREATE TABLE IF NOT EXISTS `ai_agents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Agent ID',
  `user_id` INT NOT NULL COMMENT '所属用户 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '角色名',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `system_prompt` TEXT NOT NULL COMMENT '人设+背景故事（写进system prompt）',
  `greeting` TEXT DEFAULT NULL COMMENT '初始场景（首次对话的第一条消息，不在system prompt中）',
  `model_config` JSON DEFAULT NULL COMMENT '可选模型覆盖配置',
  `is_default` BOOLEAN DEFAULT FALSE COMMENT '是否为默认角色',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_agent_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI角色扮演智能体表';

-- ============================================
-- chat_history 表新增 agent_id 列（角色扮演支持）
-- ============================================
ALTER TABLE `chat_history`
  ADD COLUMN `agent_id` INT DEFAULT NULL COMMENT '关联AI角色ID' AFTER `kb_id`,
  ADD INDEX `idx_chat_agent_id` (`agent_id`);

-- 示例数据（可选，用于测试）
-- INSERT INTO users (username, email, password, role) VALUES
-- ('admin', 'admin@example.com', '$2a$10$example_hashed_password', 'admin'),
-- ('test', 'test@example.com', '$2a$10$example_hashed_password', 'user');
