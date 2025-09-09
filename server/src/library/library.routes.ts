import { Router } from 'express';
import { isAuthenticated, isRoot } from '../auth/auth.middleware';
import * as controller from './library.controller';
import * as templateController from './library.controller';

const router = Router();

// --- Template Routes (Protected for ROOT users) ---
router.get('/library-templates', isAuthenticated, isRoot, templateController.getLibraryTemplates);
router.post('/library-templates', isAuthenticated, isRoot, templateController.createLibraryTemplate);
router.get('/library-templates/:templateId', isAuthenticated, isRoot, templateController.getLibraryTemplateById);
router.put('/library-templates/:templateId', isAuthenticated, isRoot, templateController.updateLibraryTemplate);
router.delete('/library-templates/:templateId', isAuthenticated, isRoot, templateController.deleteLibraryTemplate);

// Template File Routes
router.post('/library-templates/:templateId/files', isAuthenticated, isRoot, templateController.addFileToTemplate);
router.put('/library-templates/:templateId/files/:fileId', isAuthenticated, isRoot, templateController.updateFileInTemplate);
router.delete('/library-templates/:templateId/files/:fileId', isAuthenticated, isRoot, templateController.deleteFileFromTemplate);


// --- User Library Routes (Protected for authenticated users) ---
router.post('/libraries/import-template', isAuthenticated, controller.importLibraryTemplate); // Note the new path
router.get('/libraries', isAuthenticated, controller.getLibraries);
router.post('/libraries', isAuthenticated, controller.createLibrary);

router.get('/libraries/:libraryId', isAuthenticated, controller.getLibraryById);
router.delete('/libraries/:libraryId', isAuthenticated, controller.deleteLibrary);

// --- File Routes (Nested under libraries) ---
router.post('/libraries/:libraryId/files', isAuthenticated, controller.addFileToLibrary);
router.put('/libraries/:libraryId/files/:fileId', isAuthenticated, controller.updateFileInLibrary);
router.delete('/libraries/:libraryId/files/:fileId', isAuthenticated, controller.deleteFileFromLibrary);

export default router;
