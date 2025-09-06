import { Router } from 'express';
import { isAuthenticated, isRoot } from '../auth/auth.middleware';
import * as controller from './library.controller';

const router = Router();

// --- Template Routes (Protected for ROOT users) ---
router.get('/templates', isAuthenticated, isRoot, controller.getLibraryTemplates);
router.post('/templates', isAuthenticated, isRoot, controller.createLibraryTemplate);

// --- User Library Routes (Protected for authenticated users) ---
router.get('/', isAuthenticated, controller.getLibraries);
router.post('/', isAuthenticated, controller.createLibrary);
router.post('/import', isAuthenticated, controller.importLibraryTemplate); // Import a template to user's libraries

router.get('/:libraryId', isAuthenticated, controller.getLibraryById);
router.delete('/:libraryId', isAuthenticated, controller.deleteLibrary);

// --- File Routes (Nested under libraries) ---
router.post('/:libraryId/files', isAuthenticated, controller.addFileToLibrary);
router.put('/:libraryId/files/:fileId', isAuthenticated, controller.updateFileInLibrary);
router.delete('/:libraryId/files/:fileId', isAuthenticated, controller.deleteFileFromLibrary);


export default router;
