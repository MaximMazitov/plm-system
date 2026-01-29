import express from 'express';
import {
  addStageComment,
  getStageComments,
  addCommentAttachment,
  addChinaOfficeUpload,
  getChinaOfficeUploads,
  addPPSApproval,
  getPPSApprovals
} from '../controllers/commentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Stage comments
router.post('/stage', addStageComment);
router.get('/stage', getStageComments);

// Comment attachments
router.post('/attachments', addCommentAttachment);

// China Office uploads
router.post(
  '/china-office-uploads',
  authorizeRoles('china_office'),
  addChinaOfficeUpload
);
router.get('/china-office-uploads', getChinaOfficeUploads);

// PPS approvals
router.post(
  '/pps-approvals',
  authorizeRoles('buyer', 'constructor'),
  addPPSApproval
);
router.get('/pps-approvals', getPPSApprovals);

export default router;
