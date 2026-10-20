import re,json,sys,statistics
sys.path.insert(0,'.')
from build_draft import lines
def smooth(hs,k=2):
    out=[]
    for i in range(len(hs)):
        w=hs[max(0,i-k):i+k+1]; out.append(statistics.median(w))
    return out
def main_block(i):
    L=lines(i)
    start=0
    while start<len(L) and L[start]['y']<560: start+=1
    L=L[start:]
    if not L: return []
    sh=smooth([l['h'] for l in L])
    big=[j for j,h in enumerate(sh) if h>=47.5]
    if not big: return []
    return L[:big[-1]+1]
def clean(t):
    t=re.sub(r'(?<=[A-Za-zÀ-ɏḀ-ỿ,;:.\)’])\s+(\d{1,2})(?=[\s,;:.)—-]|$)','',t)
    t=re.sub(r'\s+([,;:.!?])',r'\1',t)
    return re.sub(r'\s+',' ',t).strip()
END=re.compile(r'[.?!:;”’"\)\]]$')
def build(a,b,book):
    ents=[];chap=0;para=0;cur=None;prev=''
    def flush():
        nonlocal cur
        if cur and cur['text'].strip(): ents.append(cur)
        cur=None
    for i in range(a,b+1):
        B=main_block(i)
        if not B: continue
        left=statistics.median([l['x'] for l in B])
        left=min(l['x'] for l in B if l['x']>=left-25) if any(l['x']>=left-25 for l in B) else left
        for l in B:
            t=l['t']
            if re.match(r'^(VISHNU PUR|BOOK\b)',t.upper()) and len(t)<25: continue
            m=re.match(r'^CHA[PR]\.?\s*([IVXLl1]+)\.?\s*(.*)',t)
            if m:
                flush();chap+=1;para=0
                cur=dict(kind='heading',book=book,chapter=chap,verse='0',page_index=i,text=m.group(2) or '');prev=cur['text']
                continue
            indent=l['x']-left>45
            small=l['h']<47.5
            if cur and cur['kind']=='heading' and not indent and small:
                cur['text']+=' '+t;prev=t;continue
            newpara = cur is None or (indent and (cur['kind']=='heading' or END.search(prev)))
            if newpara:
                flush();para+=1
                cur=dict(kind='para',book=book,chapter=chap,verse=str(para),page_index=i,text=t)
            else:
                cur['text']=(cur['text'][:-1]+t) if cur['text'].endswith('-') else cur['text']+' '+t
            prev=t
    flush()
    for e in ents: e['text']=clean(e['text'])
    return ents
if __name__=='__main__':
    ents=build(96,257,1)
    json.dump(ents,open('book1_draft2.json','w'),ensure_ascii=False,indent=0)
    import collections
    c=collections.Counter(e['chapter'] for e in ents)
    print(len(ents),'entries; chapters',max(c),[c[k] for k in sorted(c)])
    allt=' '.join(e['text'] for e in ents)
    for probe in ['Glory to Vasudeva','waveless sea','Parasara','Puriclarik']:
        print(probe, probe in allt)
    print('words',len(allt.split()))
