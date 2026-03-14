// MongoDB initialization script
// This runs inside the mongo container on first start

db = db.getSiblingDB('axiom');

// Create collections with validation
db.createCollection('users');
db.createCollection('cvs');
db.createCollection('cv_history');
db.createCollection('ratings');

// Users: unique username index
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { sparse: true });

// CVs: indexed by owner
db.cvs.createIndex({ owner_id: 1 });
db.cvs.createIndex({ slug: 1 }, { sparse: true });
db.cvs.createIndex({ owner_username: 1, slug: 1 }, { sparse: true });

// History: indexed by cv_id and owner
db.cv_history.createIndex({ cv_id: 1 });
db.cv_history.createIndex({ owner_id: 1 });
db.cv_history.createIndex({ saved_at: -1 });

// Ratings
db.ratings.createIndex({ cv_id: 1 });
db.ratings.createIndex({ created_at: -1 });

print('AXIOM MongoDB initialized successfully');
