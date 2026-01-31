import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';

// Helper function to download image and convert to buffer
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await globalThis.fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(new Uint8Array(arrayBuffer));
  } catch (error) {
    console.error('Error downloading image:', url, error);
    return null;
  }
}

// Get image extension from URL or content type
function getImageExtension(url: string): 'jpeg' | 'png' | 'gif' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.png')) return 'png';
  if (lowerUrl.includes('.gif')) return 'gif';
  return 'jpeg';
}

export const exportModelsToExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { season_id, gender, age_group, collection_id, model_ids } = req.query;

    console.log('Export request params:', { season_id, gender, age_group, collection_id, model_ids });

    // Build query based on filters
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (model_ids) {
      const ids = (model_ids as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        whereConditions.push(`m.id = ANY($${paramIndex++})`);
        params.push(ids);
      }
    }

    if (collection_id) {
      whereConditions.push(`m.collection_id = $${paramIndex++}`);
      params.push(parseInt(collection_id as string));
    }

    if (season_id) {
      whereConditions.push(`c.season_id = $${paramIndex++}`);
      params.push(parseInt(season_id as string));
    }

    // gender param maps to c.type (kids, men, women)
    if (gender) {
      whereConditions.push(`c.type = $${paramIndex++}`);
      params.push(gender);
    }

    // age_group can be either c.gender (boys, girls, babies) or c.age_group (0-2, 2-7, 7-14)
    if (age_group) {
      const ageGroupValue = age_group as string;
      // Check if it's a kids gender value or an actual age group
      if (['boys', 'girls', 'babies'].includes(ageGroupValue)) {
        whereConditions.push(`c.gender = $${paramIndex++}`);
        params.push(ageGroupValue);
      } else {
        whereConditions.push(`c.age_group = $${paramIndex++}`);
        params.push(ageGroupValue);
      }
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get models with all related data
    const modelsQuery = `
      SELECT
        m.id,
        m.model_number,
        m.model_name,
        m.category,
        m.product_type,
        m.product_group,
        m.product_group_code,
        m.fit_type,
        m.brand,
        m.prototype_number,
        m.status,
        m.created_at,
        c.name as collection_name,
        c.type as gender,
        c.age_group,
        s.name as season_name,
        f.name as supplier_name,
        (
          SELECT file_url
          FROM model_files
          WHERE model_id = m.id AND file_type = 'sketch'
          ORDER BY uploaded_at DESC
          LIMIT 1
        ) as sketch_url
      FROM models m
      LEFT JOIN collections c ON m.collection_id = c.id
      LEFT JOIN seasons s ON c.season_id = s.id
      LEFT JOIN factories f ON m.assigned_factory_id = f.id
      ${whereClause}
      ORDER BY c.type, c.age_group, c.name, m.model_number
    `;

    console.log('Export SQL query:', modelsQuery);
    console.log('Export SQL params:', params);

    const modelsResult = await pool.query(modelsQuery, params);
    const models = modelsResult.rows;

    console.log('Export found models:', models.length);

    if (models.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No models found for export. Check if there are models matching your filter criteria.'
      });
      return;
    }

    // Get materials and colors for each model
    const modelIds = models.map(m => m.id);

    const materialsResult = await pool.query(`
      SELECT model_id, material_type, name, fabric_type, fabric_weight_gsm
      FROM model_materials
      WHERE model_id = ANY($1)
    `, [modelIds]);

    const colorsResult = await pool.query(`
      SELECT model_id, pantone_code, color_name
      FROM model_colors
      WHERE model_id = ANY($1)
      ORDER BY sort_order
    `, [modelIds]);

    // Group materials and colors by model_id
    const materialsByModel: Record<number, any[]> = {};
    const colorsByModel: Record<number, any[]> = {};

    materialsResult.rows.forEach(mat => {
      if (!materialsByModel[mat.model_id]) materialsByModel[mat.model_id] = [];
      materialsByModel[mat.model_id].push(mat);
    });

    colorsResult.rows.forEach(color => {
      if (!colorsByModel[color.model_id]) colorsByModel[color.model_id] = [];
      colorsByModel[color.model_id].push(color);
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PLM System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Tender Export', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Define columns
    worksheet.columns = [
      { header: 'Скетч / Photos', key: 'sketch', width: 15 },
      { header: 'Номер модели / Model number', key: 'model_number', width: 18 },
      { header: 'Категория / Sub-Category', key: 'category', width: 20 },
      { header: 'Тип продукта / Type of product', key: 'product_type', width: 20 },
      { header: 'Розничная группа / Retail Group', key: 'product_group', width: 20 },
      { header: 'Код группы / Group Code', key: 'product_group_code', width: 12 },
      { header: 'Гендер / Gender', key: 'gender', width: 12 },
      { header: 'Бренд / Brand', key: 'brand', width: 15 },
      { header: 'Коллекция / Collection', key: 'collection', width: 20 },
      { header: 'Возраст / Size Range', key: 'age_group', width: 12 },
      { header: 'Тип посадки / Fit Type', key: 'fit_type', width: 15 },
      { header: 'Основной материал / Main Material', key: 'main_material', width: 25 },
      { header: 'Тип ткани / Fabric Type', key: 'fabric_type', width: 20 },
      { header: 'Граммаж / GSM', key: 'gsm', width: 12 },
      { header: 'Материал верха / Shell Fabric', key: 'shell_fabric', width: 25 },
      { header: 'Материал подкладки / Lining', key: 'lining', width: 25 },
      { header: 'Подкладка капюшона / Hood Lining', key: 'hood_lining', width: 25 },
      { header: 'Утеплитель / Padding', key: 'padding', width: 25 },
      { header: 'Цвет Pantone / Color Pantone', key: 'pantone', width: 20 },
      { header: 'Название цвета / Color Name', key: 'color_name', width: 20 },
      { header: 'Поставщик / Supplier', key: 'supplier', width: 20 },
      { header: 'Номер прототипа / Prototype', key: 'prototype', width: 15 },
      { header: 'Дата создания / Date', key: 'date_created', width: 15 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 40;

    // Add data rows
    let rowIndex = 2;
    for (const model of models) {
      const materials = materialsByModel[model.id] || [];
      const colors = colorsByModel[model.id] || [];

      // Find materials by type
      const mainMaterial = materials.find(m => m.material_type === 'main');
      const upperMaterial = materials.find(m => m.material_type === 'upper');
      const liningMaterial = materials.find(m => m.material_type === 'lining');
      const hoodLiningMaterial = materials.find(m => m.material_type === 'hood_lining');
      const insulationMaterial = materials.find(m => m.material_type === 'insulation');

      // Get color info (join all colors)
      const pantoneList = colors.map(c => c.pantone_code).join(', ');
      const colorNameList = colors.map(c => c.color_name).filter(Boolean).join(', ');

      // Translate gender
      let genderLabel = model.gender;
      if (model.gender === 'kids') {
        if (model.age_group === 'girls' || model.age_group === 'девочки') genderLabel = 'Girls';
        else if (model.age_group === 'boys' || model.age_group === 'мальчики') genderLabel = 'Boys';
        else if (model.age_group === 'newborn' || model.age_group === 'новорожденные') genderLabel = 'Newborn';
        else genderLabel = 'Kids';
      } else if (model.gender === 'women') {
        genderLabel = 'Women';
      } else if (model.gender === 'men') {
        genderLabel = 'Men';
      }

      const row = worksheet.addRow({
        sketch: '', // Will add image separately
        model_number: model.model_number,
        category: model.category,
        product_type: model.product_type,
        product_group: model.product_group,
        product_group_code: model.product_group_code,
        gender: genderLabel,
        brand: model.brand,
        collection: model.collection_name,
        age_group: model.age_group,
        fit_type: model.fit_type,
        main_material: mainMaterial ? mainMaterial.name : '',
        fabric_type: mainMaterial ? mainMaterial.fabric_type : '',
        gsm: mainMaterial ? mainMaterial.fabric_weight_gsm : '',
        shell_fabric: upperMaterial ? `${upperMaterial.name}${upperMaterial.fabric_type ? ' (' + upperMaterial.fabric_type + ')' : ''}${upperMaterial.fabric_weight_gsm ? ' ' + upperMaterial.fabric_weight_gsm + 'g' : ''}` : '',
        lining: liningMaterial ? `${liningMaterial.name}${liningMaterial.fabric_type ? ' (' + liningMaterial.fabric_type + ')' : ''}${liningMaterial.fabric_weight_gsm ? ' ' + liningMaterial.fabric_weight_gsm + 'g' : ''}` : '',
        hood_lining: hoodLiningMaterial ? `${hoodLiningMaterial.name}${hoodLiningMaterial.fabric_type ? ' (' + hoodLiningMaterial.fabric_type + ')' : ''}${hoodLiningMaterial.fabric_weight_gsm ? ' ' + hoodLiningMaterial.fabric_weight_gsm + 'g' : ''}` : '',
        padding: insulationMaterial ? `${insulationMaterial.name}${insulationMaterial.fabric_type ? ' (' + insulationMaterial.fabric_type + ')' : ''}${insulationMaterial.fabric_weight_gsm ? ' ' + insulationMaterial.fabric_weight_gsm + 'g' : ''}` : '',
        pantone: pantoneList,
        color_name: colorNameList,
        supplier: model.supplier_name,
        prototype: model.prototype_number,
        date_created: model.created_at ? new Date(model.created_at).toLocaleDateString('ru-RU') : ''
      });

      row.height = 80; // Height for image
      row.alignment = { vertical: 'middle', wrapText: true };

      // Download and add sketch image
      if (model.sketch_url) {
        try {
          const imageBuffer = await downloadImage(model.sketch_url);
          if (imageBuffer) {
            const imageId = workbook.addImage({
              buffer: imageBuffer as any,
              extension: getImageExtension(model.sketch_url)
            });

            worksheet.addImage(imageId, {
              tl: { col: 0, row: rowIndex - 1 },
              ext: { width: 90, height: 75 }
            });
          }
        } catch (imgError) {
          console.error('Error adding image for model:', model.model_number, imgError);
        }
      }

      rowIndex++;
    }

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate file name
    let fileName = 'tender_export';
    if (collection_id) {
      const collResult = await pool.query('SELECT name FROM collections WHERE id = $1', [collection_id]);
      if (collResult.rows.length > 0) {
        fileName = `tender_${collResult.rows[0].name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')}`;
      }
    } else if (gender) {
      fileName = `tender_${gender}`;
      if (age_group) {
        fileName += `_${age_group}`;
      }
    } else if (season_id) {
      const seasonResult = await pool.query('SELECT name FROM seasons WHERE id = $1', [season_id]);
      if (seasonResult.rows.length > 0) {
        fileName = `tender_${seasonResult.rows[0].name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')}`;
      }
    }
    fileName += `_${new Date().toISOString().split('T')[0]}`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error: any) {
    console.error('Export to Excel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export models',
      details: error.message
    });
  }
};
