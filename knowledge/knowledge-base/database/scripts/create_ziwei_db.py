import sqlite3
import os

DB_PATH = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\ziwei_cases.db"

def create_database():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"已删除旧数据库: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ziwei_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT CHECK(gender IN ('男', '女', '未知')),
        birth_date TEXT,
        solar_date TEXT,
        birth_time TEXT,
        birth_location TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ziwei_gong (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        gong_name TEXT NOT NULL CHECK(gong_name IN (
            '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
            '迁移', '仆役', '官禄', '田宅', '福德', '父母'
        )),
        gong_wei TEXT NOT NULL CHECK(gong_wei IN (
            '子', '丑', '寅', '卯', '辰', '巳',
            '午', '未', '申', '酉', '戌', '亥'
        )),
        major_stars TEXT,
        minor_stars TEXT,
        other_stars TEXT,
        FOREIGN KEY (case_id) REFERENCES ziwei_cases(id) ON DELETE CASCADE
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ziwei_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        category TEXT NOT NULL CHECK(category IN (
            '命宫总论', '事业', '婚姻', '财运', '健康', '子女',
            '父母', '兄弟', '迁移', '田宅', '福德', '仆役'
        )),
        content TEXT NOT NULL,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (case_id) REFERENCES ziwei_cases(id) ON DELETE CASCADE
    );
    """)
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gong_case ON ziwei_gong(case_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gong_name ON ziwei_gong(gong_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gong_wei ON ziwei_gong(gong_wei);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_case ON ziwei_analysis(case_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analysis_category ON ziwei_analysis(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cases_gender ON ziwei_cases(gender);")
    
    cursor.execute("""
    CREATE VIEW IF NOT EXISTS full_cases AS
    SELECT 
        c.id,
        c.name,
        c.gender,
        c.birth_date,
        c.solar_date,
        c.birth_time,
        c.birth_location,
        GROUP_CONCAT(DISTINCT g.gong_name || ':' || g.gong_wei) as gong_positions
    FROM ziwei_cases c
    LEFT JOIN ziwei_gong g ON c.id = g.case_id
    GROUP BY c.id;
    """)
    
    cursor.execute("""
    CREATE VIEW IF NOT EXISTS gong_with_analysis AS
    SELECT 
        c.id as case_id,
        c.name,
        g.gong_name,
        g.gong_wei,
        g.major_stars,
        g.minor_stars,
        g.other_stars,
        a.category,
        a.content as analysis_content,
        a.source
    FROM ziwei_cases c
    JOIN ziwei_gong g ON c.id = g.case_id
    LEFT JOIN ziwei_analysis a ON c.id = a.case_id AND a.category LIKE '%' || g.gong_name || '%';
    """)
    
    conn.commit()
    conn.close()
    print(f"数据库创建成功: {DB_PATH}")

def show_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("数据库表结构")
    print("="*60)
    
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = cursor.fetchall()
    
    for name, sql in tables:
        print(f"\n【{name}】")
        print("-"*40)
        print(sql)
    
    print("\n" + "="*60)
    print("索引")
    print("="*60)
    cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';")
    indexes = cursor.fetchall()
    for name, tbl in indexes:
        print(f"  {name} -> {tbl}")
    
    print("\n" + "="*60)
    print("视图")
    print("="*60)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='view';")
    views = cursor.fetchall()
    for (name,) in views:
        print(f"  {name}")
    
    conn.close()

if __name__ == "__main__":
    create_database()
    show_schema()
