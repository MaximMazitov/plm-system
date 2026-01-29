const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'plm_system',
  user: 'postgres',
  password: 'postgres'
});

async function resetPasswords() {
  try {
    // Пароль для всех: password123
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    await pool.query('UPDATE users SET password_hash = $1', [hash]);
    
    console.log('✓ Пароли успешно сброшены для всех пользователей');
    console.log('\nТеперь можете войти с любым email и паролем: password123');
    console.log('\nДоступные пользователи:');
    
    const result = await pool.query('SELECT email, full_name, role FROM users WHERE is_active = true');
    result.rows.forEach(user => {
      console.log(`  ${user.email} (${user.full_name}) - ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

resetPasswords();
