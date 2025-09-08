import { Model, DataTypes, Optional, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Library from './Library';

// Interface for LibraryFile attributes
export interface LibraryFileAttributes {
    id: string;
    name: string;
    url: string;
    content?: string;
    libraryId: string; // Foreign key for Library
}

// Interface for LibraryFile creation attributes
interface LibraryFileCreationAttributes extends Optional<LibraryFileAttributes, 'id'> {}

class LibraryFile extends Model<LibraryFileAttributes, LibraryFileCreationAttributes> implements LibraryFileAttributes {
    public id!: string;
    public name!: string;
    public url!: string;
    public content?: string;
    public libraryId!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associated models
    public readonly library?: Library;

    // Association mixins
    public getLibrary!: BelongsToGetAssociationMixin<Library>;
}

LibraryFile.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    libraryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'libraries', // This is a reference to another model
            key: 'id',
        }
    }
}, {
    tableName: 'library_files',
    sequelize,
});

export default LibraryFile;
