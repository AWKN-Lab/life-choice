import sqlite3
import os
import json

db_path = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 70)
print("命例数据质量验证报告")
print("=" * 70)

cursor.execute("SELECT COUNT(*) FROM basic_info")
total = cursor.fetchone()[0]
print(f"\n命例总数: {total}")

print("\n" + "=" * 70)
print("1. 格局标注率检查 (analysis.pattern)")
print("=" * 70)
cursor.execute("SELECT COUNT(*) FROM analysis WHERE pattern IS NOT NULL AND pattern != ''")
geju_count = cursor.fetchone()[0]
geju_rate = (geju_count / total * 100) if total > 0 else 0
print(f"已标注格局: {geju_count}")
print(f"未标注格局: {total - geju_count}")
print(f"标注率: {geju_rate:.2f}%")

cursor.execute("SELECT COUNT(*) FROM analysis WHERE strong_weak IS NOT NULL AND strong_weak != ''")
sw_count = cursor.fetchone()[0]
sw_rate = (sw_count / total * 100) if total > 0 else 0
print(f"\n强弱标注: {sw_count} ({sw_rate:.2f}%)")

cursor.execute("SELECT COUNT(*) FROM analysis WHERE liked_gods IS NOT NULL AND liked_gods != ''")
liked_count = cursor.fetchone()[0]
liked_rate = (liked_count / total * 100) if total > 0 else 0
print(f"喜用神标注: {liked_count} ({liked_rate:.2f}%)")

print("\n" + "=" * 70)
print("2. 四柱完整性检查 (bazi_dayun)")
print("=" * 70)
cursor.execute("""
    SELECT COUNT(*) FROM bazi_dayun 
    WHERE year_pillar IS NOT NULL AND year_pillar != ''
    AND month_pillar IS NOT NULL AND month_pillar != ''
    AND day_pillar IS NOT NULL AND day_pillar != ''
    AND hour_pillar IS NOT NULL AND hour_pillar != ''
""")
complete = cursor.fetchone()[0]
incomplete = total - complete
complete_rate = (complete / total * 100) if total > 0 else 0
print(f"四柱完整: {complete}")
print(f"四柱不完整: {incomplete}")
print(f"完整率: {complete_rate:.2f}%")

cursor.execute("""
    SELECT 
        SUM(CASE WHEN year_pillar IS NULL OR year_pillar = '' THEN 1 ELSE 0 END) as year_missing,
        SUM(CASE WHEN month_pillar IS NULL OR month_pillar = '' THEN 1 ELSE 0 END) as month_missing,
        SUM(CASE WHEN day_pillar IS NULL OR day_pillar = '' THEN 1 ELSE 0 END) as day_missing,
        SUM(CASE WHEN hour_pillar IS NULL OR hour_pillar = '' THEN 1 ELSE 0 END) as hour_missing
    FROM bazi_dayun
""")
missing = cursor.fetchone()
print(f"\n各柱缺失统计:")
print(f"  年柱缺失: {missing[0]}")
print(f"  月柱缺失: {missing[1]}")
print(f"  日柱缺失: {missing[2]}")
print(f"  时柱缺失: {missing[3]}")

print("\n" + "=" * 70)
print("3. 重复命例检查 (四柱相同)")
print("=" * 70)
cursor.execute("""
    SELECT year_pillar, month_pillar, day_pillar, hour_pillar, COUNT(*) as cnt
    FROM bazi_dayun
    WHERE year_pillar IS NOT NULL AND year_pillar != ''
    GROUP BY year_pillar, month_pillar, day_pillar, hour_pillar
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
""")
duplicates = cursor.fetchall()
dup_count = 0
if duplicates:
    print(f"发现重复四柱组合 (前20条):")
    for dup in duplicates:
        print(f"  {dup[0]} {dup[1]} {dup[2]} {dup[3]} - 重复 {dup[4]} 次")
    cursor.execute("""
        SELECT SUM(cnt - 1) FROM (
            SELECT COUNT(*) as cnt
            FROM bazi_dayun
            WHERE year_pillar IS NOT NULL AND year_pillar != ''
            GROUP BY year_pillar, month_pillar, day_pillar, hour_pillar
            HAVING COUNT(*) > 1
        )
    """)
    dup_count = cursor.fetchone()[0] or 0
    print(f"\n重复命例总数: {dup_count}")
else:
    print("未发现重复命例")

print("\n" + "=" * 70)
print("4. 格局分布统计")
print("=" * 70)
cursor.execute("""
    SELECT pattern, COUNT(*) as cnt 
    FROM analysis 
    WHERE pattern IS NOT NULL AND pattern != ''
    GROUP BY pattern 
    ORDER BY cnt DESC
""")
geju_dist = cursor.fetchall()
if geju_dist:
    print(f"格局类型数: {len(geju_dist)}")
    print(f"\n格局分布:")
    for g, cnt in geju_dist:
        pct = cnt / geju_count * 100 if geju_count > 0 else 0
        print(f"  {g}: {cnt} ({pct:.2f}%)")
else:
    print("无格局数据")

print("\n" + "=" * 70)
print("5. 强弱分布统计")
print("=" * 70)
cursor.execute("""
    SELECT strong_weak, COUNT(*) as cnt 
    FROM analysis 
    WHERE strong_weak IS NOT NULL AND strong_weak != ''
    GROUP BY strong_weak 
    ORDER BY cnt DESC
""")
sw_dist = cursor.fetchall()
if sw_dist:
    print(f"强弱类型数: {len(sw_dist)}")
    print(f"\n强弱分布:")
    for s, cnt in sw_dist:
        pct = cnt / sw_count * 100 if sw_count > 0 else 0
        print(f"  {s}: {cnt} ({pct:.2f}%)")
else:
    print("无强弱数据")

print("\n" + "=" * 70)
print("6. 日主分布统计")
print("=" * 70)
cursor.execute("""
    SELECT day_master, COUNT(*) as cnt 
    FROM bazi_dayun 
    WHERE day_master IS NOT NULL AND day_master != ''
    GROUP BY day_master 
    ORDER BY cnt DESC
""")
dm_dist = cursor.fetchall()
if dm_dist:
    print(f"日主分布:")
    for d, cnt in dm_dist:
        pct = cnt / total * 100 if total > 0 else 0
        print(f"  {d}: {cnt} ({pct:.2f}%)")
else:
    print("无日主数据")

print("\n" + "=" * 70)
print("7. 来源分布统计 (metadata.source)")
print("=" * 70)
cursor.execute("""
    SELECT source, COUNT(*) as cnt 
    FROM metadata 
    WHERE source IS NOT NULL AND source != ''
    GROUP BY source
    ORDER BY cnt DESC
""")
source_dist = cursor.fetchall()
if source_dist:
    print(f"来源分布:")
    for s, cnt in source_dist:
        print(f"  {s}: {cnt}")
else:
    print("无来源数据")

print("\n" + "=" * 70)
print("8. 基本信息完整性")
print("=" * 70)
cursor.execute("SELECT COUNT(*) FROM basic_info WHERE name IS NOT NULL AND name != ''")
name_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM basic_info WHERE gender IS NOT NULL AND gender != ''")
gender_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM basic_info WHERE birth_date IS NOT NULL AND birth_date != ''")
birth_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM basic_info WHERE birth_time IS NOT NULL AND birth_time != ''")
time_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM basic_info WHERE birth_location IS NOT NULL AND birth_location != ''")
loc_count = cursor.fetchone()[0]

print(f"姓名填写: {name_count}/{total} ({name_count/total*100:.2f}%)")
print(f"性别填写: {gender_count}/{total} ({gender_count/total*100:.2f}%)")
print(f"出生日期: {birth_count}/{total} ({birth_count/total*100:.2f}%)")
print(f"出生时辰: {time_count}/{total} ({time_count/total*100:.2f}%)")
print(f"出生地点: {loc_count}/{total} ({loc_count/total*100:.2f}%)")

print("\n" + "=" * 70)
print("9. 人生事件数据")
print("=" * 70)
cursor.execute("SELECT COUNT(*) FROM life_events")
events_count = cursor.fetchone()[0]
print(f"有人生事件记录的命例: {events_count}/{total} ({events_count/total*100:.2f}%)")

cursor.execute("SELECT COUNT(*) FROM life_events WHERE key_events IS NOT NULL AND key_events != ''")
key_events_count = cursor.fetchone()[0]
print(f"有关键事件记录: {key_events_count}/{total}")

cursor.execute("SELECT COUNT(*) FROM life_events WHERE wealth_level IS NOT NULL AND wealth_level != ''")
wealth_count = cursor.fetchone()[0]
print(f"有财富等级: {wealth_count}/{total}")

print("\n" + "=" * 70)
print("质量报告总结")
print("=" * 70)
print(f"┌{'─'*66}┐")
print(f"│ {'指标':<20} {'数值':<20} {'比例':<20} │")
print(f"├{'─'*66}┤")
print(f"│ {'命例总数':<20} {total:<20} {'100%':<20} │")
print(f"│ {'格局标注率':<20} {geju_count:<20} {f'{geju_rate:.2f}%':<20} │")
print(f"│ {'四柱完整率':<20} {complete:<20} {f'{complete_rate:.2f}%':<20} │")
print(f"│ {'重复命例数':<20} {dup_count:<20} {'-':<20} │")
print(f"│ {'人生事件记录':<20} {events_count:<20} {f'{events_count/total*100:.2f}%':<20} │")
print(f"└{'─'*66}┘")

conn.close()
