// 快速修复数据库约束的脚本
// 直接连接到 PostgreSQL 数据库并执行修复

const { Pool } = require('pg')

// 数据库连接配置 - 使用实际的远程 PostgreSQL
const pool = new Pool({
  host: '166.108.224.215',
  port: 5432,
  database: 'snapfit_ai',
  user: 'snapfit_user',
  password: 'qGgtYB6LtubgeT500jBd6asdcd5jL0e7',
  ssl: false // sslmode=disable
})

async function fixDatabase() {
  const client = await pool.connect()

  try {
    console.log('🔧 开始修复数据库...')

    // 1. 检查表是否存在
    console.log('📋 检查 daily_logs 表...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'daily_logs' AND table_schema = 'public'
      ) as table_exists;
    `)

    if (!tableCheck.rows[0].table_exists) {
      console.log('❌ daily_logs 表不存在，需要先创建表')

      // 创建 daily_logs 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_logs (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          user_id uuid NOT NULL,
          date date NOT NULL,
          log_data jsonb NOT NULL DEFAULT '{}'::jsonb,
          last_modified timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT daily_logs_pkey PRIMARY KEY (id)
        );
      `)
      console.log('✅ 创建了 daily_logs 表')
    }

    // 2. 删除重复数据
    console.log('🧹 删除重复数据...')
    const deleteResult = await client.query(`
      DELETE FROM daily_logs
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, date) id
        FROM daily_logs
        ORDER BY user_id, date, last_modified DESC
      );
    `)
    console.log(`🗑️ 删除了 ${deleteResult.rowCount} 条重复记录`)

    // 3. 删除现有约束
    console.log('🔧 删除现有约束...')
    await client.query(`
      ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_date_unique;
      ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS unique_log_per_user_per_day;
    `)

    // 4. 创建唯一约束
    console.log('🔒 创建唯一约束...')
    await client.query(`
      ALTER TABLE daily_logs
      ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);
    `)
    console.log('✅ 创建了唯一约束 daily_logs_user_date_unique')

    // 5. 创建索引
    console.log('📊 创建索引...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs USING btree (user_id, date);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs USING btree (user_id);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs USING btree (date);
      CREATE INDEX IF NOT EXISTS idx_daily_logs_last_modified ON daily_logs USING btree (last_modified);
    `)
    console.log('✅ 创建了索引')

    // 6. 创建 atomic_usage_check_and_increment 函数
    console.log('⚙️ 创建 atomic_usage_check_and_increment 函数...')
    await client.query(`
      CREATE OR REPLACE FUNCTION atomic_usage_check_and_increment(
        p_user_id uuid,
        p_usage_type text,
        p_daily_limit integer
      ) RETURNS TABLE(allowed boolean, new_count integer)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        current_count INTEGER := 0;
        new_count INTEGER := 0;
      BEGIN
        SELECT COALESCE(
          CASE
            WHEN (log_data->>p_usage_type) IS NULL THEN 0
            WHEN (log_data->>p_usage_type) = 'null' THEN 0
            ELSE (log_data->>p_usage_type)::int
          END,
          0
        )
        INTO current_count
        FROM daily_logs
        WHERE user_id = p_user_id AND date = CURRENT_DATE
        FOR UPDATE;

        current_count := COALESCE(current_count, 0);

        IF current_count >= p_daily_limit THEN
          RETURN QUERY SELECT FALSE, current_count;
          RETURN;
        END IF;

        new_count := current_count + 1;

        INSERT INTO daily_logs (user_id, date, log_data)
        VALUES (
          p_user_id,
          CURRENT_DATE,
          jsonb_build_object(p_usage_type, new_count)
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
          log_data = COALESCE(daily_logs.log_data, '{}'::jsonb) || jsonb_build_object(
            p_usage_type,
            new_count
          ),
          last_modified = NOW();

        RETURN QUERY SELECT TRUE, new_count;
      END;
      $$;
    `)
    console.log('✅ 创建了 atomic_usage_check_and_increment 函数')

    // 7. 验证修复结果
    console.log('🔍 验证修复结果...')
    const verification = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'daily_logs'
        AND table_schema = 'public'
        AND constraint_type = 'UNIQUE';
    `)

    console.log('📋 约束验证结果:')
    verification.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type}`)
    })

    // 8. 测试约束
    console.log('🧪 测试约束...')
    const testUserId = 'test-' + Date.now()
    const testDate = new Date().toISOString().split('T')[0]

    try {
      // 插入第一条记录
      await client.query(`
        INSERT INTO daily_logs (user_id, date, log_data)
        VALUES ($1, $2, $3)
      `, [testUserId, testDate, '{"test": 1}'])

      // 尝试插入重复记录（应该失败）
      try {
        await client.query(`
          INSERT INTO daily_logs (user_id, date, log_data)
          VALUES ($1, $2, $3)
        `, [testUserId, testDate, '{"test": 2}'])
        console.log('❌ 约束测试失败 - 重复插入成功了')
      } catch (error) {
        if (error.code === '23505') { // unique_violation
          console.log('✅ 约束测试成功 - 正确阻止了重复插入')
        } else {
          console.log('⚠️ 约束测试出现意外错误:', error.message)
        }
      }

      // 清理测试数据
      await client.query(`DELETE FROM daily_logs WHERE user_id = $1`, [testUserId])

    } catch (error) {
      console.log('⚠️ 约束测试失败:', error.message)
    }

    console.log('🎉 数据库修复完成！')

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error)
    throw error
  } finally {
    client.release()
  }
}

// 执行修复
fixDatabase()
  .then(() => {
    console.log('✅ 修复成功完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 修复失败:', error)
    process.exit(1)
  })
