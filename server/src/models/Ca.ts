import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interface for CA attributes, based on types.ts
export interface CaAttributes {
    id: string; // Using caNumber as the primary key
    status: string;
    validity: string;
    processNumber: string;
    nature: string;
    equipmentName: string;
    equipmentType: string;
    description: string;
    approvedFor: string;
    restrictions: string;
    observations: string;
    manufacturer: object; // JSONB
    photos: string[]; // JSONB
    history: object[]; // JSONB
    norms: string[]; // JSONB
    markings: string;
    references: string;
}

// Interface for CA creation attributes
interface CaCreationAttributes extends Optional<CaAttributes, 'id'> {}

class CA extends Model<CaAttributes, CaCreationAttributes> implements CaAttributes {
    public id!: string;
    public status!: string;
    public validity!: string;
    public processNumber!: string;
    public nature!: string;
    public equipmentName!: string;
    public equipmentType!: string;
    public description!: string;
    public approvedFor!: string;
    public restrictions!: string;
    public observations!: string;
    public manufacturer!: object;
    public photos!: string[];
    public history!: object[];
    public norms!: string[];
    public markings!: string;
    public references!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CA.init({
    id: {
        type: DataTypes.STRING, // caNumber is a string, not a UUID
        primaryKey: true,
        allowNull: false,
        field: 'ca_number' // Match the original type name
    },
    status: { type: DataTypes.STRING, allowNull: false },
    validity: { type: DataTypes.STRING, allowNull: false },
    processNumber: { type: DataTypes.STRING, allowNull: false },
    nature: { type: DataTypes.STRING, allowNull: false },
    equipmentName: { type: DataTypes.STRING, allowNull: false },
    equipmentType: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    approvedFor: { type: DataTypes.TEXT, allowNull: false },
    restrictions: { type: DataTypes.TEXT, allowNull: true },
    observations: { type: DataTypes.TEXT, allowNull: true },
    manufacturer: { type: DataTypes.JSONB, allowNull: false },
    photos: { type: DataTypes.JSONB, allowNull: true },
    history: { type: DataTypes.JSONB, allowNull: true },
    norms: { type: DataTypes.JSONB, allowNull: true },
    markings: { type: DataTypes.TEXT, allowNull: true },
    references: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'cas',
    sequelize,
});

export default CA;
