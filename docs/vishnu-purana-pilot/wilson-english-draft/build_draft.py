import xml.etree.ElementTree as ET,statistics,json,re,sys
root=ET.parse('wilson_djvu.xml').getroot()
objs=list(root.iter('OBJECT'))
def lines(i):
    out=[]
    for ln in objs[i].iter('LINE'):
        ws=ln.findall('WORD')
        if not ws: continue
        hs=[];xs=[];ys=[]
        for w in ws:
            c=[int(x) for x in w.get('coords').split(',')]
            hs.append(abs(c[1]-c[3])); xs.append(c[0]); ys.append(min(c[1],c[3]))
        out.append(dict(h=statistics.median(hs),x=min(xs),y=min(ys),t=' '.join((w.text or '') for w in ws).strip()))
    return out
def main_block(i):
    L=lines(i)
    # drop running header/page number: lines before first line with y>600 and short text
    start=0
    while start<len(L) and L[start]['y']<560: start+=1
    # footnotes start where the next three lines are small type
    end=len(L)
    for k in range(start,len(L)):
        if all(L[j]['h']<=45 for j in range(k,min(k+3,len(L)))) and L[k]['h']<=45 and k>start:
            end=k;break
    return L[start:end]
if __name__=='__main__':
    a,b=int(sys.argv[1]),int(sys.argv[2])
    paras=[];cur=None
    for i in range(a,b+1):
        B=main_block(i)
        if not B: continue
        left=min(l['x'] for l in B)
        for l in B:
            indent=l['x']-left>40
            t=l['t']
            if cur is None or indent:
                if cur: paras.append(cur)
                cur=dict(page_index=i,text=t)
            else:
                cur['text']=(cur['text'][:-1]+t) if cur['text'].endswith('-') else cur['text']+' '+t
    if cur: paras.append(cur)
    json.dump(paras,open(f'draft_{a}_{b}.json','w'),ensure_ascii=False,indent=0)
    print(len(paras))
    for p in paras[:6]: print(p['page_index'],p['text'][:150])
