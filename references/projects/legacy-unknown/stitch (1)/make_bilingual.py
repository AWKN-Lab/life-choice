import re

path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\AWKN-LABlife\stitch (1)\stitch\preview_all_pages.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add lang-toggle CSS before </style>
lang_css = '''
    /* ===== 语言切换 ===== */
    .lang-toggle { display: flex; align-items: center; gap: 2px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 2px; margin-right: 6px; }
    .lang-toggle button { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .lang-toggle button.active { background: rgba(201,169,98,0.2); color: #c9a962; }
    .lang-toggle button:hover:not(.active) { color: #fff; }
    html.lang-en .zh { display: none !important; }
    html.lang-en .en { display: inline !important; }
    html.lang-zh .en { display: none !important; }
    html.lang-zh .zh { display: inline !important; }
'''

html = html.replace('  </style>', lang_css + '  </style>')

# 2. Add lang-toggle button in nav-links
lang_toggle_btn = '    <div class="lang-toggle">\n      <button class="active" data-lang="zh">中</button>\n      <button data-lang="en">EN</button>\n    </div>\n'

html = html.replace(
    '<div class="nav-links">\n    <button class="active"',
    '<div class="nav-links">\n' + lang_toggle_btn + '    <button class="active"'
)

# 3. Translation map
translations = [
    ('人生决策宗师', '人生决策宗师', 'Life Decision Master'),
    ('>首页<', '>首页<', '>Home<'),
    ('>咨询<', '>咨询<', '>Consult<'),
    ('>历史<', '>历史<', '>Records<'),
    ('>我的<', '>我的<', '>Profile<'),
    ('命运没有标准答案<br>但<span>博弈有最优解</span>', '命运没有标准答案<br>但<span>博弈有最优解</span>', 'Fate Has No Standard Answer<br>But <span>Game Theory Has Optimal Solutions</span>'),
    ('在不确定的世界里，为你交付一套确定的坐标系', '在不确定的世界里，为你交付一套确定的坐标系', 'Delivering a definitive coordinate system in an uncertain world'),
    ('✦ 开始咨询', '✦ 开始咨询', '✦ Start Consultation'),
    ('为您提供关键节点的决策支持<br>帮助你在对的时间，做更有胜算的选择', '为您提供关键节点的决策支持<br>帮助你在对的时间，做更有胜算的选择', 'Decision support at critical turning points<br>Helping you make smarter choices at the right moment'),
    ('>开始咨询<', '>开始咨询<', '>Start Consultation<'),
    ('描述你的问题，AI 将为你智能分流', '描述你的问题，AI 将为你智能分流', 'Describe your question — AI will intelligently route it'),
    ('>您想问什么？<', '>您想问什么？<', '>What would you like to ask?<'),
    ('>能不能成<', '>能不能成<', '>Will it succeed?<'),
    ('>会不会发生<', '>会不会发生<', '>Will it happen?<'),
    ('>要不要做<', '>要不要做<', '>Should I do it?<'),
    ('>何时发生<', '>何时发生<', '>When will it happen?<'),
    ('>今年运势<', '>今年运势<', ">This year's fortune<"),
    ('>事业运<', '>事业运<', '>Career fortune<'),
    ('>确定<', '>确定<', '>Confirm<'),
    ('>咨询记录<', '>咨询记录<', '>Consultation Records<'),
    ('>这个合作还能不能继续推进<', '>这个合作还能不能继续推进<', '>Can this partnership continue to move forward?<'),
    ('>今年事业运怎么样<', '>今年事业运怎么样<', '>How is my career fortune this year?<'),
    ('>宝宝起名有什么推荐<', '>宝宝起名有什么推荐<', '>Any recommendations for baby name suggestions?<'),
    ('>订单记录<', '>订单记录<', '>Order History<'),
    ('>查看订单<', '>查看订单<', '>View Orders<'),
    ('>我的信息<', '>我的信息<', '>My Information<'),
    ('>邮箱<', '>邮箱<', '>Email<'),
    ('>手机<', '>手机<', '>Phone<'),
    ('>未绑定<', '>未绑定<', '>Not bound<'),
    ('>其他<', '>其他<', '>Other<'),
    ('>设置<', '>设置<', '>Settings<'),
    ('>帮助与反馈<', '>帮助与反馈<', '>Help & Feedback<'),
    ('>退出登录<', '>退出登录<', '>Log Out<'),
    ('>当前身份<', '>当前身份<', '>Membership<'),
    ('>轻陪伴会员<', '>轻陪伴会员<', '>Light Companion Member<'),
    ('>出生日期<', '>出生日期<', '>Date of Birth<'),
    ('>出生时辰<', '>出生时辰<', '>Birth Hour<'),
    ('>性别<', '>性别<', '>Gender<'),
    ('> ♂ 男<', '> ♂ 男<', '> ♂ Male<'),
    ('> ♀ 女<', '> ♀ 女<', '> ♀ Female<'),
    ('所在城市（真太阳时校正）', '所在城市（真太阳时校正）', 'City (Solar Time Correction)'),
    ('placeholder="如：北京、上海..."', 'placeholder="如：北京、上海..."', 'placeholder="e.g. Beijing, Shanghai..."'),
    ('placeholder="比如：这件事能不能成？今年运势如何？给宝宝起个名字..."', 'placeholder="比如：这件事能不能成？今年运势如何？给宝宝起个名字..."', 'placeholder="e.g. Will this work out? How is my fortune this year? Baby name suggestions..."'),
]

for zh, zh_marker, en in translations:
    if zh == en:
        continue
    if zh_marker in html:
        wrapped = '><span class="zh">' + zh + '</span><span class="en" style="display:none">' + en + '<'
        html = html.replace(zh_marker, wrapped, 1)

out_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\AWKN-LABlife\stitch (1)\stitch\preview_all_pages_bilingual.html'

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

print('Done, wrote', len(html), 'chars')
