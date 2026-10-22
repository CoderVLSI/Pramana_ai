import xml.etree.ElementTree as ET,statistics,re,json,sys
objs=list(ET.parse('pargiter_djvu.xml').getroot().iter('OBJECT'))
ROM={'I':1,'V':5,'X':10,'L':50,'C':100}
def rom(s):
    s=s.upper().replace('O','C').replace('G','C').replace('T','I').replace('M','X').replace('1','I').replace('L','L')
    n=0
    for i,c in enumerate(s):
        v=ROM.get(c)
        if v is None: return None
        n+= -v if i+1<len(s) and ROM.get(s[i+1],0)>v else v
    return n
def lines(i):
    H=int(objs[i].attrib['height']);out=[]
    for ln in objs[i].iter('LINE'):
        ws=ln.findall('WORD')
        if not ws: continue
        hs=[];xs=[];ys=[]
        for w in ws:
            c=[int(x) for x in w.get('coords').split(',')]
            hs.append(abs(c[1]-c[3]));xs.append(c[0]);ys.append(min(c[1],c[3]))
        out.append(dict(h=statistics.median(hs),x=min(xs),y=min(ys),t=re.sub(r'\s+',' ',' '.join((w.text or '') for w in ws)).strip(),H=H))
    return out
def main_block(i):
    L=lines(i)
    L=[l for l in L if l['y']>190]   # drop running head
    if len(L)<2: return L
    dys=[L[k+1]['y']-L[k]['y'] for k in range(len(L)-1)]
    lead=statistics.median(dys)
    for k in range(3,len(L)):
        if L[k]['y']-L[k-1]['y']>1.55*lead and L[k]['y']>0.5*L[k]['H']: return L[:k]
    return L
def clean(t):
    t=re.sub(r'(?<=[a-z,;:.\)’])\s+(\d{1,2})(?=[\s,;:.)—-]|$)','',t)  # footnote numerals after words
    t=re.sub(r'\s+([,;:.!?])',r'\1',t)
    return re.sub(r'\s+',' ',t).strip()
def lastv_prev(*a): return 0
def build(a,b):
    ents=[];canto=1;cur=None;lastv=0
    def flush():
        nonlocal cur
        if cur and cur['text'].strip(): ents.append(cur)
        cur=None
    for i in range(a,b+1):
        for l in main_block(i):
            t=l['t']
            m=re.match(r'^(?i:canto)\W*([A-Za-z0-9]{0,9})\W*$',t) if len(t)<24 else None
            if m and l['h']>=25:
                flush();canto+=1;lastv=0
                pv=rom(m.group(1)) if m.group(1) else None
                if pv and canto<=pv<=canto+2: canto=pv
                cur=dict(kind='heading',canto=canto,printed_roman=m.group(1),verse='0',page_index=i,text='');continue
            vm=re.match(r'^(\d{1,3})\s+(.*)$',t)
            if vm and l['x']<175:
                n=int(vm.group(1))
                restart = n==1 and lastv>=2
                forward = lastv < n <= lastv+3
                if restart or forward or (lastv==0 and n<=3):
                    flush()
                    if restart: canto+=1
                    lastv=n
                    cur=dict(kind='verse',canto=canto,verse=str(n),page_index=i,text=vm.group(2))
                    if forward and n>lastv_prev(ents,cur,n) : pass
                    continue
            if cur is None: cur=dict(kind='intro',canto=canto,verse='intro',page_index=i,text=t)
            elif cur['kind']=='heading' or True:
                cur['text']=(cur['text'][:-1]+t) if cur['text'].endswith('-') else (cur['text']+' '+t).strip()
    flush()
    for e in ents: e['text']=clean(e['text'])
    return ents
if __name__=='__main__':
    ents=build(44,770)
    json.dump(ents,open('mp_draft.json','w'),ensure_ascii=False,indent=0)
    import collections
    c=collections.Counter(e['canto'] for e in ents if e['kind']=='verse')
    print('entries',len(ents),'cantos seen',max(e['canto'] for e in ents),'verse entries',sum(c.values()))
    print('verses per canto (first 30):',[c[k] for k in range(1,31)])
