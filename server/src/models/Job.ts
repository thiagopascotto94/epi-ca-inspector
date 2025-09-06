import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// Based on SimilarityJob from types.ts, but more generic
export interface JobAttributes {
    id: string;
    type: 'ANALYZE_CAS' | 'SUGGEST_CONVERSION' | 'FIND_SIMILAR' | 'EXTRACT_TEXT';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    inputData: object; // JSONB to store job-specific input like caData, libraryId, etc.
    result?: object; // JSONB for the final output
    error?: string;
    progress: number;
    progressMessage?: string;
    completedAt?: Date;
    userId: string; // Foreign key for User
}

interface JobCreationAttributes extends Optional<JobAttributes, 'id' | 'status' | 'progress'> {}

class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
    public id!: string;
    public type!: 'ANALYZE_CAS' | 'SUGGEST_CONVERSION' | 'FIND_SIMILAR' | 'EXTRACT_TEXT';
    public status!: 'pending' | 'processing' | 'completed' | 'failed';
    public inputData!: object;
    public result?: object;
    public error?: string;
    public progress!: number;
    public progressMessage?: string;
    public completedAt?: Date;
    public userId!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Job.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    type: {
        type: DataTypes.ENUM('ANALYZE_CAS', 'SUGGEST_CONVERSION', 'FIND_SIMILAR', 'EXTRACT_TEXT'),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
    },
    inputData: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    result: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    progressMessage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    }
}, {
    tableName: 'jobs',
    sequelize,
});

export default Job;
