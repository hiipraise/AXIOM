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

// Notifications
db.notifications.createIndex({ user_id: 1, kind: 1 });
db.notifications.createIndex({ user_id: 1, created_at: -1 });
db.notifications.createIndex({ user_id: 1, read: 1 });

// Job cache: full-text search across title/company/description
db.job_cache.createIndex({ title: 'text', company: 'text', description: 'text' });
db.job_cache.createIndex({ posted_at: -1 });

// CV text index for global search
db.cvs.createIndex({ title: 'text', 'data.summary': 'text', 'data.skills': 'text' });

// Feedback: admin listing by type and recency
db.feedback.createIndex({ type: 1, ts: -1 });

print('AXIOM MongoDB initialized successfully');
