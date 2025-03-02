const bcrypt = require('bcrypt');
const db = require('./index');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Hash passwords
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const userPassword = await bcrypt.hash('user123', saltRounds);
    const orgPassword = await bcrypt.hash('org123', saltRounds);
    
    // Seed admin
    // Check if admin exists
    const adminCheck = await db.query('SELECT * FROM admin WHERE email = $1', ['admin@smartqueue.com']);
    if (adminCheck.rows.length === 0) {
      await db.query(
        'INSERT INTO admin (name, email, password, phone_number) VALUES ($1, $2, $3, $4)',
        ['Admin User', 'admin@smartqueue.com', adminPassword, '+901234567890']
      );
      console.log('Admin seeded successfully');
    } else {
      console.log('Admin already exists');
    }
    
    // Seed users
    const users = [
      { name: 'John Doe', email: 'john@example.com', phone: '+901111111111' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '+902222222222' },
      { name: 'Bob Johnson', email: 'bob@example.com', phone: '+903333333333' },
      { name: 'Alice Brown', email: 'alice@example.com', phone: '+904444444444' },
      { name: 'Charlie Davis', email: 'charlie@example.com', phone: '+905555555555' }
    ];
    
    for (const user of users) {
      // Check if user exists
      const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [user.email]);
      if (userCheck.rows.length === 0) {
        await db.query(
          'INSERT INTO users (name, email, password, phone_number) VALUES ($1, $2, $3, $4)',
          [user.name, user.email, userPassword, user.phone]
        );
      }
    }
    console.log('Users seeded successfully');
    
    // Seed organizations
    const organizations = [
      { 
        name: 'City Hospital', 
        email: 'hospital@example.com', 
        phone: '+906666666666',
        location: 'Downtown, City Center',
        working_hours: '08:00-20:00'
      },
      { 
        name: 'Government Office', 
        email: 'government@example.com', 
        phone: '+907777777777',
        location: 'Main Street, 123',
        working_hours: '09:00-17:00'
      },
      { 
        name: 'Beauty Salon', 
        email: 'salon@example.com', 
        phone: '+908888888888',
        location: 'Fashion Avenue, 456',
        working_hours: '10:00-22:00'
      }
    ];
    
    for (const org of organizations) {
      // Check if organization exists
      const orgCheck = await db.query('SELECT * FROM organizations WHERE email = $1', [org.email]);
      if (orgCheck.rows.length === 0) {
        await db.query(
          'INSERT INTO organizations (name, email, password, phone_number, location, working_hours) VALUES ($1, $2, $3, $4, $5, $6)',
          [org.name, org.email, orgPassword, org.phone, org.location, org.working_hours]
        );
      }
    }
    console.log('Organizations seeded successfully');
    
    console.log('Database seeding completed successfully');
    
    // Print login credentials
    console.log('\nLogin Credentials:');
    console.log('------------------');
    console.log('Admin:');
    console.log('Email: admin@smartqueue.com');
    console.log('Password: admin123');
    console.log('\nUsers:');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log('Password: user123');
    });
    console.log('\nOrganizations:');
    organizations.forEach(org => {
      console.log(`Email: ${org.email}`);
      console.log('Password: org123');
    });
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
};

// Initialize database tables before seeding
db.initDatabase()
  .then(() => seedDatabase())
  .catch(err => {
    console.error('Failed to initialize database before seeding:', err);
    process.exit(1);
  }); 