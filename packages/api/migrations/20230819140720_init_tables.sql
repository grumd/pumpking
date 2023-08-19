/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `agents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `token` varchar(30) NOT NULL,
  `title` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `agent_sessions` (
  `agent_id` int(11) NOT NULL,
  `added_at` datetime NOT NULL,
  `last_updated_at` datetime NOT NULL,
  `client_session_mark` varchar(30) NOT NULL,
  `status` json NOT NULL,
  PRIMARY KEY (`agent_id`,`client_session_mark`),
  KEY `ADDED` (`agent_id`,`added_at`) /*!80000 INVISIBLE */,
  CONSTRAINT `agent_id` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `apscheduler_jobs` (
  `id` varchar(191) NOT NULL,
  `next_run_time` double DEFAULT NULL,
  `job_state` blob NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_apscheduler_jobs_next_run_time` (`next_run_time`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `arcade_player_names` (
  `mix_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `name` varchar(20) NOT NULL,
  `name_edist` int(11) NOT NULL DEFAULT '0',
  `new_column_test` varchar(100) NOT NULL,
  PRIMARY KEY (`mix_id`,`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `arcade_track_names` (
  `mix_id` int(11) NOT NULL,
  `track_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_edist` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`mix_id`,`track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `shared_charts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `track` int(11) NOT NULL,
  `index_in_track` int(11) NOT NULL,
  `pumpout_id` int(11) DEFAULT NULL,
  `last_updated_at` datetime(3) DEFAULT NULL,
  `top_results_added_at` datetime(3) DEFAULT NULL,
  `max_pp` float(8,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6324 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `chart_instances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `track` int(11) NOT NULL,
  `shared_chart` int(11) NOT NULL,
  `mix` int(11) NOT NULL,
  `label` varchar(10) NOT NULL,
  `level` int(11) DEFAULT NULL,
  `players` int(11) DEFAULT NULL,
  `max_total_steps` int(11) DEFAULT NULL,
  `min_total_steps` int(11) DEFAULT NULL,
  `max_possible_score_norank` int(11) DEFAULT NULL,
  `max_possible_score_norank_from_result` int(11) DEFAULT NULL,
  `interpolated_difficulty` float(8,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_mix_shared_chart` (`mix`,`shared_chart`),
  KEY `shared_chart` (`shared_chart`)
) ENGINE=InnoDB AUTO_INCREMENT=22443 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `draft_scores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `added` datetime NOT NULL,
  `operator_token` varchar(30) NOT NULL,
  `track_name` varchar(100) NOT NULL,
  `mix_name` varchar(20) NOT NULL,
  `chart_label` varchar(10) NOT NULL,
  `player_name` varchar(20) DEFAULT NULL,
  `gained` datetime DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `misses` int(11) DEFAULT NULL,
  `bads` int(11) DEFAULT NULL,
  `goods` int(11) DEFAULT NULL,
  `greats` int(11) DEFAULT NULL,
  `perfects` int(11) DEFAULT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `max_combo` int(11) DEFAULT NULL,
  `calories` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `elo_changes` (
  `id` int(11) DEFAULT NULL,
  `player_id` int(11) DEFAULT NULL,
  `player_result_id` int(11) DEFAULT NULL,
  `enemy_result_id` int(11) DEFAULT NULL,
  `elo_start` decimal(7,2) DEFAULT NULL,
  `elo_end` decimal(7,2) DEFAULT NULL,
  `elo_change_calculated` decimal(7,2) DEFAULT NULL,
  `elo_change_effective` decimal(7,2) DEFAULT NULL,
  `elo_change_total` decimal(7,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `kysely_migration` (
  `name` varchar(255) NOT NULL,
  `timestamp` varchar(255) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `kysely_migration_lock` (
  `id` varchar(255) NOT NULL,
  `is_locked` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `mixes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `operators` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `phoenix_track_names` (
  `track` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `max_edit_distance` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`track`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nickname` varchar(20) NOT NULL,
  `arcade_xx_name` varchar(20) DEFAULT NULL,
  `arcade_xx_name_edist` int(11) DEFAULT '1',
  `arcade_phoenix_name` varchar(20) DEFAULT NULL,
  `arcade_phoenix_name_edist` int(11) DEFAULT '1',
  `email` varchar(100) DEFAULT NULL,
  `region` varchar(2) DEFAULT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',
  `hidden_since` datetime DEFAULT NULL,
  `discard_results` tinyint(1) DEFAULT '0',
  `actual_player_id` int(11) DEFAULT NULL,
  `telegram_id` int(11) DEFAULT NULL,
  `telegram_tag` varchar(45) DEFAULT NULL,
  `telegram_bot_preferences` json DEFAULT NULL,
  `preferences` json DEFAULT NULL,
  `show_all_regions` tinyint(1) DEFAULT '1',
  `preferences_updated` datetime DEFAULT NULL,
  `stat_top_req_counter` int(11) NOT NULL DEFAULT '0',
  `stat_top_last_req_at` datetime DEFAULT NULL,
  `pp` float(8,2) DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  `can_add_results_manually` tinyint(1) DEFAULT '0',
  `arcade_name` varchar(20) GENERATED ALWAYS AS (coalesce(`arcade_phoenix_name`,`arcade_xx_name`)) VIRTUAL,
  PRIMARY KEY (`id`),
  KEY `arcade_name` (`arcade_xx_name`),
  KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=212 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `purgatory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `screen_file` varchar(150) DEFAULT NULL,
  `recognition_notes` varchar(100) NOT NULL,
  `reason` varchar(512) NOT NULL,
  `added` datetime NOT NULL,
  `agent` int(11) NOT NULL,
  `track_name` varchar(100) NOT NULL,
  `mix_name` varchar(20) NOT NULL,
  `chart_label` varchar(10) NOT NULL,
  `player_name` varchar(20) NOT NULL,
  `gained` datetime NOT NULL,
  `exact_gain_date` tinyint(1) NOT NULL,
  `rank_mode` tinyint(1) DEFAULT NULL,
  `mods_list` varchar(40) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `score_increase` int(11) DEFAULT NULL,
  `misses` int(11) DEFAULT NULL,
  `bads` int(11) DEFAULT NULL,
  `goods` int(11) DEFAULT NULL,
  `greats` int(11) DEFAULT NULL,
  `perfects` int(11) DEFAULT NULL,
  `steps_sum` int(11) DEFAULT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `is_pass` tinyint(1) DEFAULT NULL,
  `plate` varchar(5) DEFAULT NULL,
  `max_combo` int(11) DEFAULT NULL,
  `calories` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(10) NOT NULL,
  `screen_file` varchar(300) DEFAULT NULL,
  `recognition_notes` varchar(100) NOT NULL,
  `added` datetime NOT NULL,
  `agent` int(11) NOT NULL,
  `track_name` varchar(100) NOT NULL,
  `mix_name` varchar(20) NOT NULL,
  `mix` int(11) NOT NULL,
  `chart_label` varchar(10) NOT NULL,
  `shared_chart` int(11) NOT NULL,
  `chart_instance` int(11) NOT NULL,
  `player_name` varchar(20) NOT NULL,
  `player_id` int(11) GENERATED ALWAYS AS (coalesce(`actual_player_id`,`recognized_player_id`)) STORED,
  `recognized_player_id` int(11) NOT NULL,
  `actual_player_id` int(11) DEFAULT NULL,
  `gained` datetime NOT NULL,
  `exact_gain_date` tinyint(1) NOT NULL,
  `rank_mode` tinyint(1) DEFAULT NULL,
  `mods_list` varchar(40) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `score_xx` int(11) DEFAULT NULL,
  `score_phoenix` int(11) DEFAULT NULL,
  `score_increase` int(11) DEFAULT NULL,
  `misses` int(11) DEFAULT NULL,
  `bads` int(11) DEFAULT NULL,
  `goods` int(11) DEFAULT NULL,
  `greats` int(11) DEFAULT NULL,
  `perfects` int(11) DEFAULT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `is_pass` tinyint(1) DEFAULT NULL,
  `plate` varchar(5) DEFAULT NULL,
  `max_combo` int(11) DEFAULT NULL,
  `calories` int(11) DEFAULT NULL,
  `is_new_best_score` tinyint(1) DEFAULT NULL,
  `is_hidden` tinyint(1) NOT NULL DEFAULT '0',
  `notes` varchar(512) DEFAULT NULL,
  `pp` float(8,2) DEFAULT NULL,
  `is_manual_input` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `shared_chart` (`shared_chart`,`recognized_player_id`,`score` DESC,`gained`)
) ENGINE=InnoDB AUTO_INCREMENT=196356 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `results_best_grade` (
  `player_id` int(11) NOT NULL,
  `shared_chart_id` int(11) NOT NULL,
  `result_id` int(11) NOT NULL,
  UNIQUE KEY `results_best_grade_player_id_shared_chart_id_unique` (`player_id`,`shared_chart_id`),
  KEY `results_best_grade_shared_chart_id_foreign` (`shared_chart_id`),
  KEY `results_best_grade_result_id_foreign` (`result_id`),
  CONSTRAINT `results_best_grade_player_id_foreign` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `results_best_grade_result_id_foreign` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`),
  CONSTRAINT `results_best_grade_shared_chart_id_foreign` FOREIGN KEY (`shared_chart_id`) REFERENCES `shared_charts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `results_highest_score_no_rank` (
  `player_id` int(11) NOT NULL,
  `shared_chart_id` int(11) NOT NULL,
  `result_id` int(11) NOT NULL,
  UNIQUE KEY `results_highest_score_no_rank_player_id_shared_chart_id_unique` (`player_id`,`shared_chart_id`),
  KEY `results_highest_score_no_rank_shared_chart_id_foreign` (`shared_chart_id`),
  KEY `results_highest_score_no_rank_result_id_foreign` (`result_id`),
  CONSTRAINT `results_highest_score_no_rank_player_id_foreign` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `results_highest_score_no_rank_result_id_foreign` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`),
  CONSTRAINT `results_highest_score_no_rank_shared_chart_id_foreign` FOREIGN KEY (`shared_chart_id`) REFERENCES `shared_charts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `results_highest_score_rank` (
  `player_id` int(11) NOT NULL,
  `shared_chart_id` int(11) NOT NULL,
  `result_id` int(11) NOT NULL,
  UNIQUE KEY `results_highest_score_rank_player_id_shared_chart_id_unique` (`player_id`,`shared_chart_id`),
  KEY `results_highest_score_rank_shared_chart_id_foreign` (`shared_chart_id`),
  KEY `results_highest_score_rank_result_id_foreign` (`result_id`),
  CONSTRAINT `results_highest_score_rank_player_id_foreign` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `results_highest_score_rank_result_id_foreign` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`),
  CONSTRAINT `results_highest_score_rank_shared_chart_id_foreign` FOREIGN KEY (`shared_chart_id`) REFERENCES `shared_charts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(32) NOT NULL,
  `player` int(11) NOT NULL,
  `established` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_player_foreign` (`player`),
  CONSTRAINT `sessions_player_foreign` FOREIGN KEY (`player`) REFERENCES `players` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `tournaments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `voting_end_date` date DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `state` varchar(24) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `tournament_brackets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tournament_id` int(11) DEFAULT NULL,
  `name` varchar(32) DEFAULT NULL,
  `min_level` tinyint(4) DEFAULT NULL,
  `max_level` tinyint(4) DEFAULT NULL,
  `min_player_level` tinyint(4) DEFAULT NULL,
  `max_player_level` tinyint(4) DEFAULT NULL,
  `singles_count` tinyint(4) DEFAULT NULL,
  `doubles_count` tinyint(4) DEFAULT NULL,
  `mix` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  CONSTRAINT `tournament_brackets_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `tournament_charts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tournament_id` int(11) DEFAULT NULL,
  `tournament_bracket_id` int(11) DEFAULT NULL,
  `chart_instance_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `tournament_bracket_id` (`tournament_bracket_id`),
  KEY `chart_instance_id` (`chart_instance_id`),
  CONSTRAINT `tournament_charts_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`),
  CONSTRAINT `tournament_charts_ibfk_2` FOREIGN KEY (`tournament_bracket_id`) REFERENCES `tournament_brackets` (`id`),
  CONSTRAINT `tournament_charts_ibfk_3` FOREIGN KEY (`chart_instance_id`) REFERENCES `chart_instances` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=511 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `tracks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `external_id` varchar(60) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `short_name` varchar(60) DEFAULT NULL,
  `duration` enum('Short','Standard','Remix','Full') DEFAULT NULL,
  `pumpout_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=932 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `xx_track_names` (
  `track` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `max_edit_distance` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`track`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
