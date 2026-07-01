SELECT COUNT(*) as total FROM script_records;
SELECT id, storeId, type, number, direction, subCategory, topicTitle, createdAt FROM script_records ORDER BY createdAt DESC LIMIT 10;
