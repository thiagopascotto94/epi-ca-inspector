import { Request, Response } from 'express';
import { CA } from '../models';
import { fetchNewCaData } from './ca.service';

const CACHE_DURATION_DAYS = 7;

export const getCaByNumber = async (req: Request, res: Response) => {
    const { caNumber } = req.params;
    if (!/^\d+$/.test(caNumber)) {
        return res.status(400).json({ message: 'Invalid CA number format. It must be numeric.' });
    }

    try {
        // The primary key in the model is 'id', which maps to 'ca_number'.
        // findByPk will work correctly with the value of caNumber.
        const cachedCa = await CA.findByPk(caNumber);

        if (cachedCa) {
            const now = new Date();
            const lastUpdated = new Date(cachedCa.updatedAt);
            const diffTime = Math.abs(now.getTime() - lastUpdated.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < CACHE_DURATION_DAYS) {
                return res.status(200).json({ ...cachedCa.get(), source: 'cache' });
            }
        }

        // If not in cache or cache is stale, fetch new data
        const newData = await fetchNewCaData(caNumber);

        // For upsert, we map our data to the model's attributes.
        // Sequelize will handle the mapping from the model's `id` field to the `ca_number` column.
        const upsertData = { id: newData.caNumber, ...newData };

        const [record, created] = await CA.upsert(upsertData);

        return res.status(200).json({ ...record.get(), source: created ? 'created' : 'refreshed' });

    } catch (error: any) {
        console.error(`Error in getCaByNumber for CA ${caNumber}:`, error.message);
        return res.status(500).json({ message: error.message });
    }
};
