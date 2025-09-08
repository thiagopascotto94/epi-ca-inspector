import User from './User';
import Library from './Library';
import LibraryFile from './LibraryFile';
import Job from './Job';
import CA from './Ca';
import sequelize from '../config/database';

// User -> Library Association (One-to-Many)
User.hasMany(Library, {
    foreignKey: 'userId',
    as: 'libraries'
});
Library.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User -> Job Association (One-to-Many)
User.hasMany(Job, {
    foreignKey: 'userId',
    as: 'jobs'
});
Job.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Library -> LibraryFile Association (One-to-Many)
Library.hasMany(LibraryFile, {
    foreignKey: 'libraryId',
    as: 'files',
    onDelete: 'CASCADE' // If a library is deleted, its files are also deleted
});
LibraryFile.belongsTo(Library, {
    foreignKey: 'libraryId',
    as: 'library'
});


export { User, Library, LibraryFile, Job, CA, sequelize };
