-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: clinica
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agendamentos`
--

DROP TABLE IF EXISTS `agendamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agendamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `especialidade` varchar(100) NOT NULL,
  `medico_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `data_consulta` date NOT NULL,
  `horario` time NOT NULL,
  `tipo_consulta` enum('Primeira Consulta','Retorno','Emergência') NOT NULL,
  `observacoes` text,
  `status` enum('Agendado','Em Andamento','Cancelado','Concluído') NOT NULL DEFAULT 'Agendado',
  `ativa` tinyint(1) NOT NULL DEFAULT '1',
  `lembrete_enviado` tinyint(1) NOT NULL DEFAULT '0',
  `motivo_cancelamento` varchar(255) DEFAULT NULL,
  `quem_cancelou` enum('Paciente','Adm','Médico') DEFAULT NULL,
  `inicio_consulta` time DEFAULT NULL,
  `fim_consulta` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_medico_agendamento` (`medico_id`),
  KEY `fk_usuario_agendamento` (`usuario_id`),
  CONSTRAINT `fk_medico_agendamento` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_usuario_agendamento` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `avaliacoes_pacientes`
--

DROP TABLE IF EXISTS `avaliacoes_pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avaliacoes_pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_medico` int NOT NULL,
  `id_paciente` int NOT NULL,
  `id_consulta` int DEFAULT NULL,
  `id_exame` int DEFAULT NULL,
  `nota` tinyint NOT NULL,
  `avaliacao` text NOT NULL,
  `data` date NOT NULL DEFAULT (curdate()),
  `horario` time NOT NULL DEFAULT (curtime()),
  PRIMARY KEY (`id`),
  KEY `fk_avaliacao_medico` (`id_medico`),
  KEY `fk_avaliacao_paciente` (`id_paciente`),
  KEY `fk_avaliacao_consulta` (`id_consulta`),
  KEY `fk_avaliacao_exame` (`id_exame`),
  CONSTRAINT `fk_avaliacao_consulta` FOREIGN KEY (`id_consulta`) REFERENCES `agendamentos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_avaliacao_exame` FOREIGN KEY (`id_exame`) REFERENCES `exames` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_avaliacao_medico` FOREIGN KEY (`id_medico`) REFERENCES `medicos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_avaliacao_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `avaliacoes_pacientes_chk_1` CHECK ((`nota` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exames`
--

DROP TABLE IF EXISTS `exames`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exames` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_exame` varchar(100) NOT NULL,
  `especificacao` varchar(200) NOT NULL,
  `medico_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `data_exame` date NOT NULL,
  `horario` time NOT NULL,
  `preparacao` varchar(200) DEFAULT NULL,
  `observacoes` text,
  `obs_enfermagem` text,
  `status` enum('Agendado','Cancelado','Realizado') DEFAULT 'Agendado',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `motivo` varchar(255) DEFAULT NULL COMMENT 'Motivo do cancelamento',
  PRIMARY KEY (`id`),
  KEY `fk_medico_exame` (`medico_id`),
  KEY `fk_usuario_exame` (`usuario_id`),
  CONSTRAINT `fk_medico_exame` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_usuario_exame` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `funcionarios`
--

DROP TABLE IF EXISTS `funcionarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `funcionarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `data_nascimento` date NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `cargo` enum('Recepcionista','Enfermeiro','Administrador','Técnico de Enfermagem') NOT NULL,
  `salario` decimal(10,2) NOT NULL,
  `data_contratacao` date NOT NULL,
  `endereco` varchar(200) NOT NULL,
  `numero` varchar(10) NOT NULL,
  `bairro` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `estado` varchar(2) NOT NULL,
  `cep` varchar(9) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `senha` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medicos`
--

DROP TABLE IF EXISTS `medicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `crm` varchar(20) NOT NULL,
  `especialidade` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `cep` varchar(9) NOT NULL,
  `endereco` varchar(200) NOT NULL,
  `numero` varchar(10) NOT NULL,
  `bairro` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `estado` varchar(2) NOT NULL,
  `referencia` varchar(200) DEFAULT NULL,
  `senha` varchar(255) NOT NULL,
  `token_recuperacao` varchar(255) DEFAULT NULL,
  `token_expiracao` datetime DEFAULT NULL,
  `token_confirmacao` varchar(255) DEFAULT NULL,
  `email_confirmado` tinyint(1) DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `atendimentos_realizados` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`),
  UNIQUE KEY `crm` (`crm`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prontuarios`
--

DROP TABLE IF EXISTS `prontuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prontuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `medico_id` int NOT NULL,
  `data_criacao` datetime DEFAULT CURRENT_TIMESTAMP,
  `ultima_atualizacao` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `historico_medico` text,
  `historico_familiar` text,
  `alergias` text,
  `medicamentos_uso_continuo` text,
  `observacoes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `paciente_id` (`paciente_id`),
  KEY `medico_id` (`medico_id`),
  CONSTRAINT `prontuarios_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `prontuarios_ibfk_2` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `receitas`
--

DROP TABLE IF EXISTS `receitas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receitas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `medico_id` int NOT NULL,
  `data_prescricao` datetime DEFAULT CURRENT_TIMESTAMP,
  `medicamento` varchar(100) NOT NULL,
  `dosagem` varchar(50) NOT NULL,
  `frequencia` varchar(100) NOT NULL,
  `duracao` varchar(50) NOT NULL,
  `observacoes` text,
  `status` enum('ativa','suspensa','finalizada') DEFAULT 'ativa',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `medico_id` (`medico_id`),
  CONSTRAINT `receitas_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receitas_ibfk_2` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `data_nascimento` date NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `cep` varchar(9) NOT NULL,
  `endereco` varchar(200) NOT NULL,
  `numero` varchar(10) NOT NULL,
  `bairro` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `estado` varchar(2) NOT NULL,
  `referencia` varchar(200) DEFAULT NULL,
  `senha` varchar(255) NOT NULL,
  `token_recuperacao` varchar(255) DEFAULT NULL,
  `token_expiracao` datetime DEFAULT NULL,
  `token_confirmacao` varchar(255) DEFAULT NULL,
  `email_confirmado` tinyint(1) DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_acesso` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'clinica'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-25 15:38:16
