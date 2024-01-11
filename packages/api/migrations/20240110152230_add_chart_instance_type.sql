ALTER TABLE chart_instances ADD COLUMN type ENUM('S', 'D');
UPDATE chart_instances SET type = 'S' WHERE label like 'S%';
UPDATE chart_instances SET type = 'D' WHERE label like 'D%';