import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware'; // Custom request type
import { Library, LibraryFile, User } from '../models';
import { v4 as uuidv4 } from 'uuid';

// --- Library Operations ---

export const getLibraries = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const libraries = await Library.findAll({ where: { userId }, include: ['files'] });
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get libraries', error });
    }
};

export const getLibraryById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { libraryId } = req.params;
        const library = await Library.findOne({ where: { id: libraryId, userId }, include: ['files'] });
        if (!library) {
            return res.status(404).json({ message: 'Library not found' });
        }
        res.status(200).json(library);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get library', error });
    }
};

export const createLibrary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name } = req.body;
        const newLibrary = await Library.create({ name, userId });
        res.status(201).json(newLibrary);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create library', error });
    }
};

export const deleteLibrary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { libraryId } = req.params;
        const result = await Library.destroy({ where: { id: libraryId, userId } });
        if (result === 0) {
            return res.status(404).json({ message: 'Library not found' });
        }
        res.status(204).send(); // No content
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete library', error });
    }
};

// --- Library Template Operations (ROOT only) ---

export const getLibraryTemplates = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const templates = await Library.findAll({ where: { isSystemModel: true }, include: ['files'] });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get library templates', error });
    }
};

export const createLibraryTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Templates are not tied to a specific user, but we can assign them to the root user
        const rootUser = await User.findOne({where: {email: process.env.ROOT_USER_EMAIL}});
        if(!rootUser) return res.status(500).json({message: "Root user not found"});

        const { name, files } = req.body;
        const newTemplate = await Library.create({
            name,
            userId: rootUser.id,
            isSystemModel: true,
            files: files || []
        }, {
            include: ['files']
        });
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create library template', error });
    }
};

export const importLibraryTemplate = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { templateId } = req.body;
        const template = await Library.findOne({ where: { id: templateId, isSystemModel: true }, include: ['files'] });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        const newLibrary = await Library.create({
            name: template.name,
            userId: userId,
            systemModelId: template.id,
            files: template.files?.map((file: LibraryFile) => ({
                name: file.name,
                url: file.url,
                content: file.content
            })) || []
        }, { include: ['files'] });

        res.status(201).json(newLibrary);
    } catch (error) {
        res.status(500).json({ message: 'Failed to import library template', error });
    }
};


// --- File Operations ---

export const addFileToLibrary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { libraryId } = req.params;
        const { name, url, content } = req.body;

        // Ensure user owns the library
        const library = await Library.findOne({ where: { id: libraryId, userId } });
        if (!library) {
            return res.status(404).json({ message: 'Library not found' });
        }

        const newFile = await LibraryFile.create({ name, url, content, libraryId });
        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add file to library', error });
    }
};

export const updateFileInLibrary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { libraryId, fileId } = req.params;
        const { name, url, content } = req.body;

        const library = await Library.findOne({ where: { id: libraryId, userId } });
        if (!library) {
            return res.status(404).json({ message: 'Library not found' });
        }

        const [updatedCount, updatedFiles] = await LibraryFile.update(
            { name, url, content },
            { where: { id: fileId, libraryId }, returning: true }
        );

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.status(200).json(updatedFiles[0]);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update file', error });
    }
};

export const deleteFileFromLibrary = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { libraryId, fileId } = req.params;

        const library = await Library.findOne({ where: { id: libraryId, userId } });
        if (!library) {
            return res.status(404).json({ message: 'Library not found' });
        }

        const result = await LibraryFile.destroy({ where: { id: fileId, libraryId } });
        if (result === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete file', error });
    }
};
