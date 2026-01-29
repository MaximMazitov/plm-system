import express from 'express';
import {
  createModel,
  getModels,
  getModelById,
  updateModel,
  deleteModel,
  assignFactory,
  updateBuyerApproval,
  updateConstructorApproval
} from '../controllers/modelController';
import {
  getModelImages,
  getModelMaterials,
  getModelSpecifications,
  getModelHistory,
  getModelColors,
  addModelColor,
  updateModelColor,
  deleteModelColor,
  uploadModelImage,
  addModelMaterial,
  updateModelMaterial,
  deleteModelMaterial,
  addModelSpecification
} from '../controllers/modelDetailController';
import {
  getModelFiles,
  uploadModelFile,
  deleteModelFile,
  exportModelFiles,
  upload
} from '../controllers/modelFilesController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create model - designers and constructors
router.post(
  '/',
  checkPermission('can_create_models'),
  createModel
);

// Get all models
router.get('/', checkPermission('can_view_models'), getModels);

// Get single model
router.get('/:id', checkPermission('can_view_models'), getModelById);

// Update model
router.put(
  '/:id',
  checkPermission('can_edit_models'),
  updateModel
);

// Partial update model (PATCH)
router.patch(
  '/:id',
  checkPermission('can_edit_models'),
  updateModel
);

// Delete model - only buyer
router.delete('/:id', checkPermission('can_delete_models'), deleteModel);

// Assign factory
router.put('/:id/assign-factory', checkPermission('can_edit_models'), assignFactory);

// Update buyer approval
router.put('/:id/buyer-approval', authorizeRoles('buyer'), updateBuyerApproval);

// Update constructor approval
router.put('/:id/constructor-approval', authorizeRoles('constructor'), updateConstructorApproval);

// Model details routes
router.get('/:id/images', getModelImages);
router.post('/:id/images', authorizeRoles('designer', 'constructor', 'buyer'), uploadModelImage);

router.get('/:id/materials', checkPermission('can_view_materials'), getModelMaterials);
router.post('/:id/materials', checkPermission('can_edit_materials'), addModelMaterial);
router.put('/:id/materials/:materialId', checkPermission('can_edit_materials'), updateModelMaterial);
router.delete('/:id/materials/:materialId', checkPermission('can_delete_materials'), deleteModelMaterial);

router.get('/:id/colors', checkPermission('can_view_models'), getModelColors);
router.post('/:id/colors', checkPermission('can_edit_models'), addModelColor);
router.put('/:id/colors/:colorId', checkPermission('can_edit_models'), updateModelColor);
router.delete('/:id/colors/:colorId', checkPermission('can_edit_models'), deleteModelColor);

router.get('/:id/specifications', getModelSpecifications);
router.post('/:id/specifications', checkPermission('can_edit_models'), addModelSpecification);

router.get('/:id/history', getModelHistory);

// Model files routes
router.get('/:id/files/export', checkPermission('can_view_files'), exportModelFiles);
router.get('/:id/files', checkPermission('can_view_files'), getModelFiles);
router.post('/:id/files', checkPermission('can_upload_files'), upload.single('file'), uploadModelFile);
router.delete('/:id/files/:fileId', checkPermission('can_delete_files'), deleteModelFile);

export default router;
