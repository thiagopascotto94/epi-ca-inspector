import { Model, DataTypes, Optional, HasManyGetAssociationsMixin, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import LibraryFile, { LibraryFileAttributes } from './LibraryFile';
import User from './User';

// Interface for Library attributes
export interface LibraryAttributes {
    id: string;
    name: string;
    isSystemModel: boolean;
    systemModelId?: string;
    usageCount: number;
    userId: string; // Foreign key for User
    files?: LibraryFileAttributes[]; // For eager loading
}

// Interface for Library creation attributes
interface LibraryCreationAttributes extends Optional<LibraryAttributes, 'id' | 'isSystemModel' | 'usageCount'> {}

class Library extends Model<LibraryAttributes, LibraryCreationAttributes> implements LibraryAttributes {
    public id!: string;
    public name!: string;
    public isSystemModel!: boolean;
    public systemModelId?: string;
    public usageCount!: number;
    public userId!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associated models
    public readonly files?: LibraryFile[];
    public readonly user?: User;

    // Association mixins
    public getFiles!: HasManyGetAssociationsMixin<LibraryFile>;
    public getUser!: BelongsToGetAssociationMixin<User>;
}

Library.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isSystemModel: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    systemModelId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users', // This is a reference to another model
            key: 'id',
        }
    }
}, {
    tableName: 'libraries',
    sequelize,
});

export default Library;
