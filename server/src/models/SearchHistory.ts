import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface SearchHistoryAttributes {
    id: string;
    userId: string;
    caNumber: string;
}

interface SearchHistoryCreationAttributes extends Optional<SearchHistoryAttributes, 'id'> {}

class SearchHistory extends Model<SearchHistoryAttributes, SearchHistoryCreationAttributes> implements SearchHistoryAttributes {
    public id!: string;
    public userId!: string;
    public caNumber!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SearchHistory.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    caNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'search_histories',
    sequelize,
});

export default SearchHistory;
