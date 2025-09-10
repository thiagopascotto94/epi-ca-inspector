import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { SearchHistory } from '../models';
import { Op } from 'sequelize';

export const getSearchHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const history = await SearchHistory.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 20, // Get last 20, we'll get unique on the client
        });
        // The client expects an array of strings
        const caNumbers = history.map((h: SearchHistory) => h.caNumber);
        const uniqueCaNumbers = [...new Set(caNumbers)].slice(0, 10);
        res.status(200).json(uniqueCaNumbers);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get search history', error });
    }
};

export const addSearchHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { caNumber } = req.body;

        if (!caNumber) {
            return res.status(400).json({ message: 'caNumber is required' });
        }

        // To prevent spamming the history, we can remove older entries for the same CA
        await SearchHistory.destroy({ where: { userId, caNumber } });

        const newHistoryEntry = await SearchHistory.create({ userId, caNumber });
        res.status(201).json(newHistoryEntry);

    } catch (error) {
        res.status(500).json({ message: 'Failed to add search history', error });
    }
};

export const clearSearchHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        await SearchHistory.destroy({ where: { userId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear search history', error });
    }
};
