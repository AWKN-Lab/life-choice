import sqlite3
conn = sqlite3.connect('c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/knowledge-base/database/liuren.db')
cursor = conn.cursor()

print('===== 九宗门 =====')
cursor.execute('SELECT * FROM jiu_zong_men')
cols = [d[0] for d in cursor.description]
for row in cursor.fetchall():
    print(dict(zip(cols, row)))

print('\n===== 天将 =====')
cursor.execute('SELECT * FROM tian_jiang')
cols = [d[0] for d in cursor.description]
for row in cursor.fetchall():
    print(dict(zip(cols, row)))

print('\n===== 干寄宫 =====')
cursor.execute('SELECT * FROM gan_ji_gong')
cols = [d[0] for d in cursor.description]
for row in cursor.fetchall():
    print(dict(zip(cols, row)))

print('\n===== 六壬神煞 =====')
cursor.execute('SELECT * FROM liuren_shensha')
cols = [d[0] for d in cursor.description]
for row in cursor.fetchall():
    print(dict(zip(cols, row)))
