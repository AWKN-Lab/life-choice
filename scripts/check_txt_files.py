#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查 TXT 文件大小"""
import os

files = [
    "knowledge/eastern-metaphysics/六壬/道传小六壬 (佚名) (z-library.sk, 1lib.sk, z-lib.sk).txt",
    "knowledge/eastern-metaphysics/六壬/精选命理约言 (韦千里) (z-library.sk, 1lib.sk, z-lib.sk).txt",
    "knowledge/eastern-metaphysics/六壬/春龙集六壬简验真诀 (张金和著 小窗攸记 校) (z-library.sk, 1lib.sk, z-lib.sk).txt",
    "knowledge/eastern-metaphysics/六壬/批命104例 (韦千里) (z-library.sk, 1lib.sk, z-lib.sk).txt",
    "knowledge/eastern-metaphysics/六壬/千里命稿 (韦千里) (z-library.sk, 1lib.sk, z-lib.sk).txt",
    "knowledge/eastern-metaphysics/六壬/《大六壬银河棹正附集》.txt",
    "knowledge/eastern-metaphysics/取名/纳音全解.txt",
    "knowledge/eastern-metaphysics/取名/开门：主宰数字，改变命运.txt",
    "knowledge/eastern-metaphysics/六壬/案例库/案例.txt",
    "knowledge/eastern-metaphysics/八字命理/命理案例.txt",
    "knowledge/eastern-metaphysics/八字命理/古今中外名人八字集锦.txt",
]

for f in files:
    if os.path.exists(f):
        size = os.path.getsize(f)
        with open(f, encoding="utf-8", errors="ignore") as fh:
            lines = sum(1 for _ in fh)
        print(f"{size:>8} bytes  {lines:>5} lines  {f}")
    else:
        print(f"  [NOT FOUND] {f}")
