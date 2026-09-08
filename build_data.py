# -*- coding: utf-8 -*-
"""Trích xuất dữ liệu nét viết (stroke order) của Hiragana + Katakana từ KanjiVG.
KanjiVG (c) Ulrich Apel — CC BY-SA 3.0 — http://kanjivg.tagaini.net
"""
import os, re, json, unicodedata

SRC = "/home/claude/kana/kanji"

# ---------------------------------------------------------------- bảng ký tự
GOJUON = [
    ("a",  "あいうえお",      "アイウエオ",      ["a","i","u","e","o"]),
    ("ka", "かきくけこ",      "カキクケコ",      ["ka","ki","ku","ke","ko"]),
    ("sa", "さしすせそ",      "サシスセソ",      ["sa","shi","su","se","so"]),
    ("ta", "たちつてと",      "タチツテト",      ["ta","chi","tsu","te","to"]),
    ("na", "なにぬねの",      "ナニヌネノ",      ["na","ni","nu","ne","no"]),
    ("ha", "はひふへほ",      "ハヒフヘホ",      ["ha","hi","fu","he","ho"]),
    ("ma", "まみむめも",      "マミムメモ",      ["ma","mi","mu","me","mo"]),
    ("ya", "や・ゆ・よ",      "ヤ・ユ・ヨ",      ["ya","","yu","","yo"]),
    ("ra", "らりるれろ",      "ラリルレロ",      ["ra","ri","ru","re","ro"]),
    ("wa", "わ・・・を",      "ワ・・・ヲ",      ["wa","","","","wo"]),
    ("n",  "ん・・・・",      "ン・・・・",      ["n","","","",""]),
]
DAKUON = [
    ("ga", "がぎぐげご", "ガギグゲゴ", ["ga","gi","gu","ge","go"]),
    ("za", "ざじずぜぞ", "ザジズゼゾ", ["za","ji","zu","ze","zo"]),
    ("da", "だぢづでど", "ダヂヅデド", ["da","ji","zu","de","do"]),
    ("ba", "ばびぶべぼ", "バビブベボ", ["ba","bi","bu","be","bo"]),
    ("pa", "ぱぴぷぺぽ", "パピプペポ", ["pa","pi","pu","pe","po"]),
]
YOON = [
    ("kya", ["きゃ","きゅ","きょ"], ["キャ","キュ","キョ"], ["kya","kyu","kyo"]),
    ("sha", ["しゃ","しゅ","しょ"], ["シャ","シュ","ショ"], ["sha","shu","sho"]),
    ("cha", ["ちゃ","ちゅ","ちょ"], ["チャ","チュ","チョ"], ["cha","chu","cho"]),
    ("nya", ["にゃ","にゅ","にょ"], ["ニャ","ニュ","ニョ"], ["nya","nyu","nyo"]),
    ("hya", ["ひゃ","ひゅ","ひょ"], ["ヒャ","ヒュ","ヒョ"], ["hya","hyu","hyo"]),
    ("mya", ["みゃ","みゅ","みょ"], ["ミャ","ミュ","ミョ"], ["mya","myu","myo"]),
    ("rya", ["りゃ","りゅ","りょ"], ["リャ","リュ","リョ"], ["rya","ryu","ryo"]),
    ("gya", ["ぎゃ","ぎゅ","ぎょ"], ["ギャ","ギュ","ギョ"], ["gya","gyu","gyo"]),
    ("ja",  ["じゃ","じゅ","じょ"], ["ジャ","ジュ","ジョ"], ["ja","ju","jo"]),
    ("bya", ["びゃ","びゅ","びょ"], ["ビャ","ビュ","ビョ"], ["bya","byu","byo"]),
    ("pya", ["ぴゃ","ぴゅ","ぴょ"], ["ピャ","ピュ","ピョ"], ["pya","pyu","pyo"]),
]

# gợi ý đọc gần đúng cho người Việt
VN = {
 "a":"a","i":"i","u":"ư (môi không tròn)","e":"ê","o":"ô",
 "ka":"ka","ki":"ki","ku":"kư","ke":"kê","ko":"kô",
 "sa":"xa","shi":"si","su":"xư","se":"xê","so":"xô",
 "ta":"ta","chi":"chi","tsu":"tsư (bật hơi)","te":"tê","to":"tô",
 "na":"na","ni":"ni","nu":"nư","ne":"nê","no":"nô",
 "ha":"ha","hi":"hi","fu":"phư (thổi nhẹ)","he":"hê","ho":"hô",
 "ma":"ma","mi":"mi","mu":"mư","me":"mê","mo":"mô",
 "ya":"ya","yu":"yu","yo":"yô",
 "ra":"ra (giữa r và l)","ri":"ri","ru":"rư","re":"rê","ro":"rô",
 "wa":"oa","wo":"ô (đọc như を = o)","n":"n / ng / m (âm mũi cuối)",
 "ga":"ga","gi":"ghi","gu":"gư","ge":"ghê","go":"gô",
 "za":"dza","ji":"ji (gi)","zu":"dzư","ze":"dzê","zo":"dzô",
 "da":"đa","de":"đê","do":"đô",
 "ba":"ba","bi":"bi","bu":"bư","be":"bê","bo":"bô",
 "pa":"pa","pi":"pi","pu":"pư","pe":"pê","po":"pô",
 "kya":"kya","kyu":"kyư","kyo":"kyô",
 "sha":"sa","shu":"sư","sho":"sô",
 "cha":"cha","chu":"chư","cho":"chô",
 "nya":"nha","nyu":"như","nyo":"nhô",
 "hya":"hya","hyu":"hyư","hyo":"hyô",
 "mya":"mya","myu":"myư","myo":"myô",
 "rya":"rya","ryu":"ryư","ryo":"ryô",
 "gya":"gya","gyu":"gyư","gyo":"gyô",
 "ja":"ja (gia)","ju":"jư","jo":"jô",
 "bya":"bya","byu":"byư","byo":"byô",
 "pya":"pya","pyu":"pyư","pyo":"pyô",
}

ROW_LABEL = {
 "a":"あ行 / ア行","ka":"か行 / カ行","sa":"さ行 / サ行","ta":"た行 / タ行",
 "na":"な行 / ナ行","ha":"は行 / ハ行","ma":"ま行 / マ行","ya":"や行 / ヤ行",
 "ra":"ら行 / ラ行","wa":"わ行 / ワ行","n":"ん / ン",
 "ga":"が行 / ガ行","za":"ざ行 / ザ行","da":"だ行 / ダ行","ba":"ば行 / バ行","pa":"ぱ行 / パ行",
 "kya":"きゃ行","sha":"しゃ行","cha":"ちゃ行","nya":"にゃ行","hya":"ひゃ行",
 "mya":"みゃ行","rya":"りゃ行","gya":"ぎゃ行","ja":"じゃ行","bya":"びゃ行","pya":"ぴゃ行",
}

# ------------------------------------------------------- đọc path từ KanjiVG
PATH_RE = re.compile(r'<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"')
NUM_RE  = re.compile(r'-?\d*\.?\d+')

def round_d(d, nd=2):
    """Rút gọn số trong path data để giảm dung lượng."""
    def rep(m):
        v = round(float(m.group(0)), nd)
        s = f"{v:.{nd}f}".rstrip("0").rstrip(".")
        return s if s not in ("", "-") else "0"
    return NUM_RE.sub(rep, d)

_cache = {}
def strokes_of(ch):
    if ch in _cache: return _cache[ch]
    fp = os.path.join(SRC, "%05x.svg" % ord(ch))
    if not os.path.exists(fp):
        _cache[ch] = None; return None
    xml = open(fp, encoding="utf-8").read()
    found = PATH_RE.findall(xml)
    found.sort(key=lambda t: int(t[0]))
    out = [round_d(d) for _, d in found]
    _cache[ch] = out
    return out

# -------------------------------------------------------------- xây dữ liệu
glyphs, chars, missing = {}, [], []

def add_char(ch, romaji, script, group, row, col):
    comps = list(ch)
    for g in comps:
        if g not in glyphs:
            s = strokes_of(g)
            if s is None or not s:
                missing.append(g); return
            glyphs[g] = s
    chars.append({
        "c": ch, "r": romaji, "vn": VN.get(romaji, romaji),
        "s": script, "g": group, "row": row, "col": col,
        "n": sum(len(glyphs[g]) for g in comps),
    })

for script, idx in (("h", 1), ("k", 2)):
    for table, group in ((GOJUON, "basic"), (DAKUON, "dakuten")):
        for row, hira, kata, romajis in table:
            src = hira if script == "h" else kata
            for col, (ch, rj) in enumerate(zip(src, romajis)):
                if ch == "・" or not rj: continue
                add_char(ch, rj, script, group, row, col)
    for row, hira, kata, romajis in YOON:
        src = hira if script == "h" else kata
        for col, (ch, rj) in enumerate(zip(src, romajis)):
            add_char(ch, rj, script, group="yoon", row=row, col=col)

data = {
    "license": "Stroke data derived from KanjiVG (c) Ulrich Apel, CC BY-SA 3.0 — http://kanjivg.tagaini.net",
    "viewBox": 109,
    "rowLabels": ROW_LABEL,
    "glyphs": glyphs,
    "chars": chars,
}
out = "/home/claude/app/kana-data.json"
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("Ký tự:", len(chars), "| glyph gốc:", len(glyphs), "| thiếu:", missing)
print("Hiragana:", sum(1 for c in chars if c["s"]=="h"), "Katakana:", sum(1 for c in chars if c["s"]=="k"))
from collections import Counter
print(Counter(c["g"] for c in chars))
print("Kích thước:", round(os.path.getsize(out)/1024, 1), "KB")
