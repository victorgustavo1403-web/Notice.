#!/usr/bin/env python3
"""Gera src/styles/tema-escuro.css a partir dos CSS do projeto.
Cada declaração de cor é convertida para a paleta escura (neutros invertidos,
cores da marca preservadas). Ajustes manuais ficam em tema-escuro-ajustes.css."""
import re, glob, sys, colorsys, os
ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'src/styles/tema-escuro.css')
PRE = 'html[data-tema="escuro"] '

COLOR_RE = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b')

def parse(c):
    c = c.strip().lower()
    if c == 'white': return (255,255,255,1.0)
    if c == 'black': return (0,0,0,1.0)
    if c.startswith('#'):
        h = c[1:]
        if len(h) == 3: h = ''.join(x*2 for x in h)
        r,g,b = (int(h[i:i+2],16) for i in (0,2,4))
        a = int(h[6:8],16)/255 if len(h)==8 else 1.0
        return (r,g,b,a)
    nums = re.findall(r'[\d.]+', c)
    r,g,b = (float(n) for n in nums[:3])
    a = float(nums[3]) if len(nums) > 3 else 1.0
    return (r,g,b,a)

def chroma(r,g,b):
    mx, mn = max(r,g,b), min(r,g,b)
    return (mx-mn)/255

def lum(r,g,b): return (0.299*r+0.587*g+0.114*b)

def fmt(g, a, warm=True):
    g = max(0, min(255, g))
    r, gg, b = g, g, g - (2 if warm and g > 20 else 0)
    r, gg, b = round(r), round(gg), round(max(0, b))
    if a >= 0.995: return '#%02x%02x%02x' % (r,gg,b)
    return 'rgba(%d, %d, %d, %s)' % (r,gg,b, ('%.3f' % a).rstrip('0').rstrip('.'))

def text_map(g):
    if g >= 235: return 28
    if g >= 170: return 152 - (g-170)*(124/65)
    if g >= 51:  return 245 - (g-51)*0.78
    return 245 + (51-g)*0.2

def bg_map(g):
    if g >= 200: return 34 - (255-g)*0.55
    if g >= 100: return 255 - g - 40
    return 245 - (g-51)*0.9 if g >= 51 else 245 + (51-g)*0.2

def convert_color(tok, role):
    r,g,b,a = parse(tok)
    if chroma(r,g,b) > 0.16:   # cor da marca / erro / sucesso: preserva
        return None
    L = lum(r,g,b)
    if role == 'text':
        return fmt(text_map(L), a)
    if role == 'bg':
        if L >= 235 and a < 0.995:   # vidro branco translúcido
            return 'rgba(255, 255, 255, %s)' % ('%.3f' % min(a*0.1, 0.12)).rstrip('0').rstrip('.')
        if L < 45 and a < 0.995:     # véu escuro translúcido (fundo de pop-up)
            return fmt(0, min(a*1.4, 0.85), False)
        if L < 100 and a < 0.995:    # tom escuro translúcido -> claro translúcido
            return fmt(bg_map(L), a)
        return fmt(bg_map(L), a)
    if role == 'border':
        if L >= 235:
            return 'rgba(255, 255, 255, %s)' % ('%.3f' % min(a*0.16, 0.2)).rstrip('0').rstrip('.')
        if L >= 150:
            return 'rgba(245, 244, 238, %s)' % ('%.2f' % (0.2*a)).rstrip('0').rstrip('.')
        return fmt(text_map(L) if a >= 0.995 else 245, a)
    if role == 'shadow':
        if L < 40:
            return fmt(0, min(a*1.8, 0.75), False)
        if L >= 235:
            return 'rgba(255, 255, 255, %s)' % ('%.3f' % min(a*0.12, 0.15)).rstrip('0').rstrip('.')
        if L >= 240:
            return fmt(28, a)
        return fmt(text_map(L), a)
    return None

def role_of(prop):
    p = prop.strip().lower()
    if p in ('color','fill','stroke','caret-color','-webkit-text-fill-color','text-decoration-color','column-rule-color'): return 'text'
    if p.startswith('border') or p.startswith('outline'): return 'border'
    if 'shadow' in p: return 'shadow'
    if p.startswith('background') or p.startswith('--'): return 'bg'
    return None

def convert_decl(prop, val, brand_bg):
    role = role_of(prop)
    if not role: return None
    if role == 'text' and brand_bg: return None
    if 'url(' in val and role == 'bg':
        pass
    changed = False
    def rep(m):
        nonlocal changed
        # dentro de box-shadow, um anel claro (#f5f4ee/#fff) separa o elemento do fundo: vira superfície escura
        n = convert_color(m.group(0), role)
        if n is None: return m.group(0)
        changed = True
        return n
    if role == 'shadow':
        # cores de anel (opacas) invertem como fundo; sombras (alpha) seguem a regra de sombra
        def rep2(m):
            nonlocal changed
            r,g,b,a = parse(m.group(0))
            if chroma(r,g,b) > 0.16: return m.group(0)
            L = lum(r,g,b)
            if a >= 0.995:
                n = fmt(bg_map(L) if L >= 200 else text_map(L), a)
                if L >= 200: n = fmt(34, a)
            else:
                n = convert_color(m.group(0), 'shadow')
            changed = True
            return n
        new = COLOR_RE.sub(rep2, val)
    else:
        new = COLOR_RE.sub(rep, val)
    return new if changed and new != val else None

def strip_comments(s): return re.sub(r'/\*.*?\*/', '', s, flags=re.S)

def parse_blocks(s):
    """devolve lista de ('rule', sel, body) | ('at', header, [filhos])"""
    out, i, n = [], 0, len(s)
    while i < n:
        j = s.find('{', i)
        if j < 0: break
        head = s[i:j].strip()
        depth, k = 1, j+1
        while k < n and depth:
            if s[k] == '{': depth += 1
            elif s[k] == '}': depth -= 1
            k += 1
        body = s[j+1:k-1]
        if head.startswith('@'):
            if head.startswith(('@media','@supports')):
                out.append(('at', head, parse_blocks(body)))
            # @keyframes, @font-face: ignorados
        else:
            out.append(('rule', head, body))
        i = k
    return out

BRAND_BG = re.compile(r'background[^;]*?(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\))')
def has_brand_bg(body):
    for d in body.split(';'):
        if ':' not in d: continue
        prop, val = d.split(':',1)
        if prop.strip().lower() in ('background','background-color'):
            for c in COLOR_RE.findall(val):
                r,g,b,a = parse(c)
                if chroma(r,g,b) > 0.16 and a > 0.5: return True
    return False

def emit_rule(sel, body):
    brand = has_brand_bg(body)
    decls = []
    for d in body.split(';'):
        if ':' not in d: continue
        prop, val = d.split(':',1)
        imp = ''
        v = val.strip()
        if v.endswith('!important'): imp, v = ' !important', v[:-10].strip()
        new = convert_decl(prop, v, brand)
        if new: decls.append('  %s: %s%s;' % (prop.strip(), ' '.join(new.split()), imp))
    if not decls: return ''
    sels = []
    for s_ in [x.strip() for x in sel.split(',')]:
        if not s_ or s_.startswith(('*', ':root', 'html', 'body')) and not s_.startswith('body '):
            if s_.startswith('body') : pass
            continue
        sels.append(PRE + s_)
    if not sels: return ''
    return ',\n'.join(sels) + ' {\n' + '\n'.join(decls) + '\n}\n'

def emit(blocks):
    s = ''
    for b in blocks:
        if b[0] == 'rule':
            s += emit_rule(b[1], b[2])
        else:
            inner = emit(b[2])
            if inner: s += b[1] + ' {\n' + inner + '}\n'
    return s

out = ['/* GERADO por tools/gerar_tema_escuro.py — não edite à mão (use tema-escuro-ajustes.css) */\n']
for f in sorted(glob.glob(os.path.join(ROOT, 'src/styles/*.css'))):
    name = os.path.basename(f)
    if name.startswith('tema-escuro') or name in ('padroes.css', 'tv.css'): continue
    css = strip_comments(open(f, encoding='utf8').read())
    body = emit(parse_blocks(css))
    if body: out.append('\n/* ===== %s ===== */\n%s' % (name, body))
open(OUT, 'w', encoding='utf8').write(''.join(out))
print('ok', len(''.join(out)))
