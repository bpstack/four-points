-- =============================================
-- CONSULTAS PARA MAINTENANCE_IMAGES
-- =============================================
USE hotel_db;
-- Buscar todas las imágenes de mantenimiento
SELECT * 
FROM maintenance_images 
ORDER BY uploaded_at DESC;

-- Buscar imágenes de un reporte específico
SELECT * 
FROM maintenance_images 
WHERE report_id = '181225-002';

-- Buscar imagen por nombre
SELECT * 
FROM maintenance_images 
WHERE file_name LIKE '%sample%';

-- Buscar imágenes subidas a Cloudinary
SELECT * 
FROM maintenance_images 
WHERE file_path LIKE '%cloudinary%';

-- =============================================
-- CONSULTAS ÚTILES ADICIONALES
-- =============================================


-- Para limpiar las referencias en MySQL                                                                   
-- Ejecuta esto en tu cliente MySQL:                                                                                                                                     
																																										   
-- Limpiar URLs de PDFs validados (tabla bo_invoices)                                                                                                                         
UPDATE bo_invoices
SET validated_pdf_url = NULL,
 validated_pdf_public_id = NULL
WHERE validated_pdf_url IS NOT NULL;
																																										   
-- Si también quieres limpiar los PDFs originales:                                                                                                                     
UPDATE bo_invoices                                                                                                                                                            
SET original_pdf_url = NULL,
 original_pdf_public_id = NULL
WHERE original_pdf_url IS NOT NULL;


-- Contar imágenes por reporte
SELECT report_id, COUNT(*) as total_images
FROM maintenance_images
GROUP BY report_id
ORDER BY total_images DESC;

-- Imágenes subidas hoy
SELECT * 
FROM maintenance_images 
WHERE DATE(uploaded_at) = CURDATE();

-- Reportes con sus imágenes (JOIN)
SELECT 
    r.report_id,
    r.title,
    r.status,
    mi.file_name,
    mi.file_path
FROM maintenance_reports r
LEFT JOIN maintenance_images mi ON r.report_id = mi.report_id
ORDER BY r.created_at DESC;



SELECT 'Tablas Back Office creadas correctamente' AS resultado;
SELECT 'Categorías insertadas:' AS info, COUNT(*) AS total FROM bo_categories;
SELECT 'Proveedores insertados:' AS info, COUNT(*) AS total FROM bo_suppliers;
SHOW TABLES LIKE 'bo_%';