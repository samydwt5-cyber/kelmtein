#!/usr/bin/env python3
"""يستبدل رابط النشر المؤقت YOUR-USER.github.io/kelmtein/ بالرابط الحقيقي في ملفات SEO.
الاستخدام:  python3 tools/set_domain.py https://اسمك.github.io/kelmtein/  [مجلد_الموقع]"""
import sys, re, os
if len(sys.argv) < 2 or not re.fullmatch(r'https://[A-Za-z0-9.\-]+(/[A-Za-z0-9._\-]+)*/', sys.argv[1]):
    sys.exit('أدخل رابطاً يبدأ بـ https:// وينتهي بـ / مثل: https://user.github.io/kelmtein/')
new = sys.argv[1]; root = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
old = 'https://YOUR-USER.github.io/kelmtein/'; n = 0
for f in ('index.html', 'robots.txt', 'sitemap.xml'):
    p = os.path.join(root, f); t = open(p, encoding='utf-8').read(); c = t.count(old)
    if c: open(p, 'w', encoding='utf-8').write(t.replace(old, new)); n += c; print(f'{f}: {c} استبدال')
print('تم' if n else 'لا يوجد ما يُستبدل (ربما ضُبط الرابط سابقاً)')
